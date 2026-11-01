import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateStructured, generateEvaluation, transcribeAudio } from "./ai.server";
import { runCode, sameValue, judgeStatus } from "./runner.server";
import { levelFromManual, stepLevel } from "./levels";
import {
  deliveryPrompt,
  summarizeDelivery,
  voiceRecordingSchema,
  type VoiceDelivery,
} from "./voice-delivery";
import { questionRules, resumeFacts, spokenEvaluationRules } from "./interview-rules";
import { combineVideoFeedback, videoEvidenceSchema, type VideoFeedback } from "./video-interview";
import { assessVideo } from "./video-assessment.server";
import { evaluateTogether } from "./evaluation-workflow";

/* ---------------- Quiz (replaces the old generate-quiz function) ---------------- */

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic: string; difficulty: "easy" | "medium" | "hard"; count: number }) =>
    z
      .object({
        topic: z.string().min(1).max(80),
        difficulty: z.enum(["easy", "medium", "hard"]),
        count: z.number().int().min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const options = data.difficulty === "easy" ? 3 : 4;
    const out = await generateStructured(
      quizSchema,
      "You write accurate multiple-choice quiz questions. Never repeat a question. Exactly one option is correct.",
      `Write ${data.count} ${data.difficulty} multiple-choice questions about "${data.topic}". Each has exactly ${options} options, correctIndex is the 0-based index of the right option, and a one-sentence explanation.`,
    );
    const questions = out.questions
      .filter(
        (q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length,
      )
      .slice(0, data.count);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: attempt, error } = await supabaseAdmin
      .from("quiz_attempts")
      .insert({
        user_id: context.userId,
        topic: data.topic,
        difficulty: data.difficulty,
        questions: JSON.parse(JSON.stringify(questions)),
      })
      .select("id")
      .single();
    if (error || !attempt) throw new Error("Could not start the quiz. Please try again.");
    return {
      attemptId: attempt.id as string,
      questions: questions.map((q) => ({ question: q.question, options: q.options })),
    };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        attemptId: z.string().uuid(),
        answers: z.array(z.number().int().min(-1).max(10)).max(50),
        seconds: z.number().int().min(0).max(86400),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claimed, error } = await supabaseAdmin
      .from("quiz_attempts")
      .update({ used: true })
      .eq("id", data.attemptId)
      .eq("user_id", context.userId)
      .eq("used", false)
      .select("*")
      .maybeSingle();
    if (error || !claimed) throw new Error("This quiz was already submitted or has expired.");
    const qs = claimed.questions as unknown as z.infer<typeof quizSchema>["questions"];
    const score = qs.reduce((a, q, k) => a + (data.answers[k] === q.correctIndex ? 1 : 0), 0);
    const elapsed = Math.floor((Date.now() - new Date(claimed.created_at).getTime()) / 1000);
    const { error: insErr } = await supabaseAdmin.from("quiz_results").insert({
      user_id: context.userId,
      topic: claimed.topic,
      difficulty: claimed.difficulty,
      score,
      total_questions: qs.length,
      question_count: qs.length,
      time_spent_seconds: Math.min(data.seconds, Math.max(0, elapsed)),
    });
    if (insErr) {
      await supabaseAdmin.from("quiz_attempts").update({ used: false }).eq("id", claimed.id);
      throw new Error("Could not save your quiz. Press Finish to retry.");
    }
    return { score, questions: qs };
  });

/* ---------------- Adaptive interviews ---------------- */

const questionSchema = z.object({ question: z.string() });

const evalSchema = z.object({
  score: z.number().min(0).max(10),
  correctness: z.number().min(0).max(10),
  completeness: z.number().min(0).max(10),
  clarity: z.number().min(0).max(10),
  confidence: z.number().min(0).max(10),
  depth: z.number().min(0).max(10),
  feedback: z.string(),
  improvedAnswer: z.string(),
  idealAnswer: z.string(),
  missingConcepts: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  needsFollowUp: z.boolean(),
});
export type Evaluation = z.infer<typeof evalSchema> & {
  voiceDelivery?: VoiceDelivery;
  videoFeedback?: VideoFeedback;
};

const INTERVIEWER =
  "You are a sharp but friendly technical interviewer for students and job seekers. Ask one clear question at a time, conversational in tone, no preamble, no numbering.";

function categoryPrompt(category: string, topic: string, context: string | null) {
  if (category === "project")
    return `The candidate described this project: """${context ?? ""}""". Challenge architecture decisions, scalability, trade-offs and implementation details.`;
  if (category === "teach")
    return `The candidate claims to understand: """${context ?? topic}""". Probe their real depth, starting broad and drilling into mechanisms, edge cases and "why not X" comparisons.`;
  if (category === "resume")
    return `Ask realistic recruiter-style questions based on this resume/profile: """${context ?? ""}""".`;
  return `Topic: ${topic} (${category}).`;
}

async function askQuestion(opts: {
  category: string;
  topic: string;
  context: string | null;
  level: string;
  history: { question: string; answer: string | null; score: number | null }[];
  followUp: boolean;
  voice: boolean;
}) {
  const hist = opts.history
    .map((h, i) => `Q${i + 1}: ${h.question}\nA: ${h.answer ?? "(none)"}\nScore: ${h.score ?? "-"}`)
    .join("\n\n");
  const out = await generateStructured(
    questionSchema,
    INTERVIEWER,
    `${categoryPrompt(opts.category, opts.topic, opts.context)}
Difficulty level: ${opts.level} (ladder: Easy, Medium, Medium+, Hard, Hard+, Expert).
${hist ? `Conversation so far:\n${hist}\n` : ""}
${opts.followUp ? "Ask a natural follow-up that digs into a gap or interesting point in the last answer." : "Ask a new question that has not been asked yet."}
${questionRules(opts.voice)}`,
  );
  return out.question.trim();
}

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.string().max(40),
        topic: z.string().min(1).max(120),
        difficulty: z.enum(["easy", "medium", "hard"]),
        adaptive: z.boolean(),
        followUps: z.boolean(),
        mode: z.enum(["text", "voice", "written", "video"]),
        context: z.string().max(8000).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let ctx = data.context;
    if (data.category === "resume") {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      const { data: bank } = await supabase
        .from("resume_questions")
        .select("topic, resume_item")
        .order("created_at", { ascending: false })
        .limit(40);
      const bankText = resumeFacts(bank ?? []);
      ctx =
        `Target role: ${p?.target_role ?? "-"}; College: ${p?.college ?? "-"}; Skills: ${(p?.skills ?? []).join(", ")}. ${ctx ?? ""}${
          bankText
            ? `\nResume items as background facts only; write fresh questions grounded in these items:\n${bankText}`
            : ""
        }`.slice(0, 8000);
    }
    let level: string = levelFromManual(data.difficulty);
    if (data.adaptive) {
      const { data: r } = await supabase
        .from("topic_ratings")
        .select("rating")
        .eq("topic", data.topic)
        .maybeSingle();
      if (r)
        level =
          ["Easy", "Medium", "Medium+", "Hard", "Hard+", "Expert"][
            Math.min(5, Math.floor(Number(r.rating) / 1.8))
          ] ?? "Medium";
    }
    const { data: interview, error } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        category: data.category,
        topic: data.topic,
        difficulty: data.difficulty,
        adaptive: data.adaptive,
        follow_ups: data.followUps,
        mode: data.mode,
        context: ctx,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const question = await askQuestion({
      category: data.category,
      topic: data.topic,
      context: ctx,
      level,
      history: [],
      followUp: false,
      voice: data.mode === "voice" || data.mode === "video",
    });
    const { data: turn, error: tErr } = await supabase
      .from("interview_turns")
      .insert({ user_id: userId, interview_id: interview.id, question, difficulty: level })
      .select()
      .single();
    if (tErr) throw new Error(tErr.message);
    return {
      interviewId: interview.id as string,
      turn: { id: turn.id as string, question, difficulty: level },
    };
  });

export const submitAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        turnId: z.string().uuid(),
        answer: z.string().min(1).max(12000),
        wantNext: z.boolean(),
        recordings: z.array(voiceRecordingSchema).max(30).optional(),
        video: videoEvidenceSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: turn, error } = await supabase
      .from("interview_turns")
      .select("*")
      .eq("id", data.turnId)
      .single();
    if (error || !turn) throw new Error("Question not found.");
    const { data: interview } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", turn.interview_id)
      .single();
    if (!interview) throw new Error("Interview not found.");
    if (interview.completed_at) throw new Error("This interview has ended.");
    if (turn.score !== null && turn.evaluation) {
      const saved = turn.rating_result as { rating?: number; previousRating?: number } | null;
      return {
        evaluation: turn.evaluation as unknown as Evaluation,
        rating: saved?.rating ?? 5,
        previousRating: saved?.previousRating ?? 5,
        next: null,
        answer: turn.answer ?? "",
      };
    }
    const voice = interview.mode === "voice" || interview.mode === "video";
    if (interview.mode === "video" && !data.video)
      throw new Error("Record an answer and consent to AI processing first.");
    const key = process.env["LOVABLE_API_KEY"];
    const delivery = voice ? summarizeDelivery(data.recordings ?? []) : null;

    const [ev, videoAssessment] = await evaluateTogether(
      () =>
        generateEvaluation(
          key ?? "",
          evalSchema,
          "You are a rigorous but encouraging interview evaluator. Scores are 0-10 numbers. Be specific and concise.",
          `${categoryPrompt(interview.category, interview.topic, interview.context)}
Difficulty: ${turn.difficulty}
Question: ${turn.question}
Candidate answer${voice ? " (spoken, transcribed — also judge spoken communication)" : ""}: """${data.answer}"""
${voice ? deliveryPrompt(delivery) : ""}
${voice ? spokenEvaluationRules : ""}
Evaluate technical correctness, completeness, communication clarity, confidence, depth and accuracy. Give an overall score, feedback (2 concise sentences), an improved version of their answer (up to 80 words), an ideal answer (up to 80 words), missing concepts, strengths and weaknesses (up to 3 short topic tags each like "Deadlocks" or "SQL Joins"), and whether a follow-up question would be valuable. Preserve the specific technical explanation; avoid repeated advice.`,
        ),
      () =>
        interview.mode === "video" && data.video
          ? assessVideo(key ?? "", data.video)
          : Promise.resolve(null),
    );
    const score = Math.min(10, Math.max(0, ev.score));
    const evaluation: Evaluation = {
      ...ev,
      score,
      ...(delivery ? { voiceDelivery: delivery } : {}),
      ...(videoAssessment && data.video
        ? { videoFeedback: combineVideoFeedback(videoAssessment, score, data.video.setting) }
        : {}),
    };
    // Scores are written only by the server so users cannot set their own grades.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saved, error: saveError } = await supabaseAdmin.rpc("record_interview_answer", {
      p_user: userId,
      p_turn: turn.id,
      p_answer: data.answer,
      p_evaluation: JSON.parse(JSON.stringify(evaluation)),
    });
    if (saveError) throw new Error(saveError.message);
    return saved as unknown as {
      evaluation: Evaluation;
      rating: number;
      previousRating: number;
      next: null;
      answer: string;
    };
  });

export const nextInterviewQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ turnId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: turn } = await supabase
      .from("interview_turns")
      .select("*")
      .eq("id", data.turnId)
      .single();
    if (!turn || turn.score === null) throw new Error("Submit this answer before continuing.");
    const { data: interview } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", turn.interview_id)
      .single();
    if (!interview || interview.completed_at) throw new Error("This interview has ended.");
    const { data: allTurns } = await supabase
      .from("interview_turns")
      .select("id, question, difficulty, answer")
      .eq("interview_id", interview.id)
      .order("created_at");
    const existing = (allTurns ?? []).find((t) => !t.answer);
    if (existing)
      return { id: existing.id, question: existing.question, difficulty: existing.difficulty };
    const score = Number(turn.score);
    const ev = turn.evaluation as unknown as Evaluation;
    const voice = interview.mode === "voice" || interview.mode === "video";
    const level = interview.adaptive ? stepLevel(turn.difficulty, score) : turn.difficulty;
    const { data: prev } = await supabase
      .from("interview_turns")
      .select("question, answer, score")
      .eq("interview_id", interview.id)
      .order("created_at");
    const question = await askQuestion({
      category: interview.category,
      topic: interview.topic,
      context: interview.context,
      level,
      history: (prev ?? []).map((p) => ({
        question: p.question,
        answer: p.answer,
        score: p.score === null ? null : Number(p.score),
      })),
      followUp: interview.follow_ups && ev.needsFollowUp,
      voice,
    });
    const { data: nt, error: nextError } = await supabase.rpc("append_interview_question", {
      p_id: interview.id,
      p_question: question,
      p_difficulty: level,
    });
    if (nextError || !nt)
      throw new Error(nextError?.message ?? "Could not prepare the next question. Please retry.");
    return nt as unknown as { id: string; question: string; difficulty: string };
  });

export const finishInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ interviewId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("complete_interview", {
      p_id: data.interviewId,
    });
    if (error) throw new Error(error.message);
    return result as unknown as { avg: number | null; answered: number; xpGained: number };
  });

/* ---------------- Coding ---------------- */

const problemSchema = z.object({
  title: z.string(),
  statement: z.string(),
  examples: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string() })),
  constraints: z.array(z.string()),
  signatures: z.object({
    python: z.string(),
    javascript: z.string(),
    java: z.string(),
    cpp: z.string(),
  }),
  hiddenTests: z
    .array(
      z.object({
        input: z.string(),
        expected: z.string().refine((v) => {
          try {
            JSON.parse(v);
            return true;
          } catch {
            return false;
          }
        }, "Expected output must be JSON"),
      }),
    )
    .min(1)
    .max(20),
});
export type CodingProblem = Omit<z.infer<typeof problemSchema>, "hiddenTests"> & {
  id: string;
  testCount: number;
};

export const generateCodingProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ topic: z.string().max(60), difficulty: z.enum(["easy", "medium", "hard"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const problem = await generateStructured(
      problemSchema,
      "You write LeetCode-style interview coding problems with precise statements and correct test cases.",
      `Create one ${data.difficulty} coding interview problem on ${data.topic}. Include 2 examples, 3-5 constraints, a function signature (no body, no boilerplate) for python, javascript, java and cpp using the same function name, and 6 hidden tests including edge cases, with inputs as argument literals and expected outputs as canonical JSON (strings double quoted, booleans lowercase).`,
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saved, error } = await supabaseAdmin
      .from("coding_problems")
      .insert({
        user_id: context.userId,
        topic: data.topic,
        problem: JSON.parse(JSON.stringify(problem)),
      })
      .select("id")
      .single();
    if (error || !saved) throw new Error("Could not save the coding problem. Please retry.");
    const { hiddenTests, ...publicProblem } = problem;
    return { ...publicProblem, id: saved.id, testCount: hiddenTests.length };
  });

const reviewSchema = z.object({
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  edgeCases: z.string(),
  style: z.string(),
  improvements: z.array(z.string()),
  summary: z.string(),
});
const harnessSchema = z.object({ program: z.string() });

type JudgeTest = { input: string; expected: string; actual: string; passed: boolean };
type JudgeResultT = z.infer<typeof reviewSchema> & {
  tests: JudgeTest[];
  compiles: boolean;
  score: number;
  status: string;
  error: string;
  timeSec: number | null;
  memoryKb: number | null;
  executed: true;
};
export type JudgeResult = JudgeResultT;

export const judgeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        problemId: z.string().uuid(),
        language: z.enum(["python", "javascript", "java", "cpp"]),
        code: z.string().min(1).max(20000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stored, error: problemError } = await supabaseAdmin
      .from("coding_problems")
      .select("problem")
      .eq("id", data.problemId)
      .eq("user_id", userId)
      .single();
    if (problemError || !stored) throw new Error("Problem not found. Generate a new problem.");
    const problem = problemSchema.parse(stored.problem);
    const tests = problem.hiddenTests;
    // 1. AI writes only the test driver around the untouched candidate code.
    const { program } = await generateStructured(
      harnessSchema,
      "You build test drivers for an online judge. Embed the candidate code EXACTLY as given (character for character, never fix or change it). Add only imports, a wrapper class/main if the language needs one, and a driver. If the candidate already wrote a main/class, keep theirs and add the driver calls without editing their logic. For each test i (0-based), call the solution inside try/catch, then print a line `__T<i>__` followed on the next line by the result serialized as compact JSON (lists as [..], strings quoted, booleans true/false, null). On exception print `__T<i>__` then `ERROR: <message>`. Print nothing else.",
      `Language: ${data.language}\nFunction signature hint: ${problem.signatures[data.language]}\nTests (input is the argument list): ${JSON.stringify(tests.map((t) => t.input))}\n\nCandidate code:\n${data.code}\n\nReturn the full runnable program.`,
    );
    const squash = (x: string) => x.replace(/\s+/g, "");
    const usable = squash(program).includes(squash(data.code));
    // 2. Run it for real.
    const run = await runCode(data.language, usable ? program : data.code);
    const out = run.stdout;
    const actuals = tests.map((_, i) => {
      const m = out.split(`__T${i}__`)[1];
      return m === undefined ? "" : (m.split(/__T\d+__/)[0] ?? "").trim();
    });
    const compiles = !run.compileOutput && run.status !== "Compilation Error";
    const testResults: JudgeTest[] = tests.map((t, i) => ({
      input: t.input,
      expected: t.expected,
      actual: actuals[i] || (compiles ? run.status : "Compilation error"),
      passed:
        !!actuals[i] && !actuals[i]?.startsWith("ERROR") && sameValue(actuals[i] ?? "", t.expected),
    }));
    const passedCount = testResults.filter((t) => t.passed).length;
    const errorText = (run.compileOutput || run.stderr).slice(0, 2000);
    // 3. AI reviews quality, given the real results.
    const review = await generateStructured(
      reviewSchema,
      "You are a senior code reviewer. The code was actually executed; treat the given test results as ground truth.",
      `Problem: ${problem.title}\n${problem.statement}\nLanguage: ${data.language}\nReal results: ${passedCount}/${tests.length} passed. Status: ${run.status}. Errors: ${errorText || "none"}\nRuntime: ${run.timeSec ?? "?"}s, memory ${run.memoryKb ?? "?"}KB\n\nCode:\n\`\`\`\n${data.code}\n\`\`\`\nGive time/space complexity, edge-case notes, style notes, improvements and a short summary.`,
    );
    const res: JudgeResultT = {
      ...review,
      tests: testResults,
      compiles,
      score:
        Math.round((passedCount / Math.max(1, tests.length)) * 80) / 10 +
        (passedCount === tests.length ? 2 : 0),
      status: judgeStatus(run.status, passedCount, tests.length),
      error: errorText,
      timeSec: run.timeSec,
      memoryKb: run.memoryKb,
      executed: true,
    };
    const score = Math.min(10, Math.max(0, res.score));
    const { error: saveError } = await supabaseAdmin.rpc("save_coding_result", {
      p_user: userId,
      p_problem: data.problemId,
      p_language: data.language,
      p_code: data.code,
      p_result: JSON.parse(JSON.stringify({ ...res, score })),
    });
    if (saveError) throw new Error("Could not save coding feedback. Please retry.");
    return { ...res, score };
  });

/* ---------------- Voice ---------------- */

export const transcribe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ audio: z.string().max(28_000_000), mime: z.string().max(60) }).parse(d),
  )
  .handler(async ({ data }) => ({ text: await transcribeAudio(data.audio, data.mime) }));

/* ---------------- Resume question bank ---------------- */

const resumeQSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        topic: z.string(),
        resumeItem: z.string(),
        kind: z.enum(["technical", "project", "behavioral", "experience"]),
        difficulty: z.enum(["easy", "medium", "hard"]),
      }),
    )
    .min(1)
    .max(30),
});

export const generateResumeQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ count: z.number().int().min(5).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: p } = await supabase
      .from("profiles")
      .select("resume_path, target_role, skills")
      .eq("id", userId)
      .maybeSingle();
    if (!p?.resume_path) throw new Error("Upload your resume on the Profile page first.");
    const { data: file, error } = await supabase.storage.from("resumes").download(p.resume_path);
    if (error || !file) throw new Error("Could not read your resume. Try uploading it again.");
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000)
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const out = await generateStructured(
      resumeQSchema,
      "You are a senior technical interviewer. Read the attached resume and write interview questions grounded in specific items on it: projects, internships/jobs, listed technologies, achievements. Every question must reference something concrete from the resume. Mix technical depth, project trade-offs, experience and behavioral questions.",
      `Write ${data.count} questions. Target role: ${p.target_role ?? "not given"}. For each give: the question, a short topic (e.g. "React", "System Design"), resumeItem (the exact project/job/skill it comes from), kind, difficulty.`,
      { filename: "resume.pdf", base64: btoa(bin) },
    );
    const rows = out.questions.slice(0, data.count).map((q) => ({
      user_id: userId,
      question: q.question,
      topic: q.topic.slice(0, 80),
      resume_item: q.resumeItem.slice(0, 200),
      kind: q.kind,
      difficulty: q.difficulty,
    }));
    const { error: insErr } = await supabase.rpc("replace_resume_questions", {
      p_path: p.resume_path,
      p_rows: rows,
    });
    if (insErr) throw new Error(insErr.message);
    return { count: rows.length };
  });

/* ---------------- Concept practice ---------------- */

const lessonSchema = z.object({
  explanation: z.string(),
  keyPoints: z.array(z.string()),
  exercises: z.array(z.object({ prompt: z.string(), hint: z.string() })),
});

export const conceptLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ concept: z.string().min(1).max(120), level: z.enum(["easy", "medium", "hard"]) })
      .parse(d),
  )
  .handler(async ({ data }) =>
    generateStructured(
      lessonSchema,
      "You are a patient computer-science tutor. Write fresh, original material every time; never reuse stock textbook questions.",
      `Concept: "${data.concept}" at ${data.level} level. Give a clear explanation (2 short paragraphs, plain language, one concrete example), 3-5 key points, and exactly 4 varied practice exercises (mix of explain-why, predict-the-output/apply, compare, and a tricky edge case) each with a short hint that doesn't give the answer away.`,
    ),
  );

const checkSchema = z.object({
  verdict: z.enum(["correct", "partial", "incorrect"]),
  score: z.number().min(0).max(10),
  feedback: z.string(),
  modelAnswer: z.string(),
});

export const checkConceptAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        concept: z.string().max(120),
        exercise: z.string().max(2000),
        answer: z.string().min(1).max(6000),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    generateStructured(
      checkSchema,
      "You are a supportive tutor grading a student's practice answer. Be honest and specific, encourage them, score 0-10.",
      `Concept: ${data.concept}\nExercise: ${data.exercise}\nStudent answer: """${data.answer}"""\nGive a verdict, score, 2-4 sentences of feedback on what's right and what's missing, and a concise model answer.`,
    ),
  );

/* ---------------- AI discussion ---------------- */

export const discuss = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
          .min(1)
          .max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const transcript = data.messages
      .map((m) => `${m.role === "user" ? "Student" : "Mentor"}: ${m.content}`)
      .join("\n\n");
    const out = await generateStructured(
      z.object({ reply: z.string() }),
      "You are InterviewVerse's friendly mentor for students and job seekers. Discuss whatever the student brings up — concepts, doubts, code, career, interview prep. Explain clearly with examples, ask a guiding question when useful, and keep replies focused. Use Markdown-free plain text with short paragraphs and simple '-' bullet lists.",
      `Conversation so far:\n${transcript}\n\nWrite the Mentor's next reply.`,
    );
    return { reply: out.reply };
  });
