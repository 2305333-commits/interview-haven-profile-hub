import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateStructured, transcribeAudio } from "./ai.server";
import { levelFromManual, stepLevel, updateRating } from "./levels";

/* ---------------- Quiz (replaces the old generate-quiz function) ---------------- */

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
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
  .handler(async ({ data }) => {
    const options = data.difficulty === "easy" ? 3 : 4;
    const out = await generateStructured(
      quizSchema,
      "You write accurate multiple-choice quiz questions. Never repeat a question. Exactly one option is correct.",
      `Write ${data.count} ${data.difficulty} multiple-choice questions about "${data.topic}". Each has exactly ${options} options, correctIndex is the 0-based index of the right option, and a one-sentence explanation.`,
    );
    return out.questions
      .filter(
        (q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length,
      )
      .slice(0, data.count);
  });

/* ---------------- Adaptive interviews ---------------- */

const questionSchema = z.object({ question: z.string() });

const evalSchema = z.object({
  score: z.number(),
  correctness: z.number(),
  completeness: z.number(),
  clarity: z.number(),
  confidence: z.number(),
  depth: z.number(),
  feedback: z.string(),
  improvedAnswer: z.string(),
  idealAnswer: z.string(),
  missingConcepts: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  needsFollowUp: z.boolean(),
});
export type Evaluation = z.infer<typeof evalSchema>;

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
${opts.voice ? "This is spoken aloud: keep it under 40 words." : "Keep it under 70 words."}`,
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
        mode: z.enum(["text", "voice"]),
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
      ctx = `Target role: ${p?.target_role ?? "-"}; College: ${p?.college ?? "-"}; Skills: ${(p?.skills ?? []).join(", ")}. ${ctx ?? ""}`;
    }
    let level: string = levelFromManual(data.difficulty);
    if (data.adaptive) {
      const { data: r } = await supabase
        .from("topic_ratings")
        .select("rating")
        .eq("topic", data.topic)
        .maybeSingle();
      if (r)
        level = ["Easy", "Medium", "Medium+", "Hard", "Hard+", "Expert"][
          Math.min(5, Math.floor(Number(r.rating) / 1.8))
        ]!;
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
      voice: data.mode === "voice",
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
    const voice = interview.mode === "voice";

    const ev = await generateStructured(
      evalSchema,
      "You are a rigorous but encouraging interview evaluator. Scores are 0-10 numbers. Be specific and concise.",
      `${categoryPrompt(interview.category, interview.topic, interview.context)}
Difficulty: ${turn.difficulty}
Question: ${turn.question}
Candidate answer${voice ? " (spoken, transcribed — also judge spoken communication)" : ""}: """${data.answer}"""
Evaluate technical correctness, completeness, communication clarity, confidence, depth and accuracy. Give an overall score, feedback (2-4 sentences), an improved version of their answer, an ideal answer, missing concepts (short tags), strengths and weaknesses (short topic tags like "Deadlocks" or "SQL Joins"), and whether a follow-up question would be valuable.`,
    );
    const score = Math.min(10, Math.max(0, ev.score));
    await supabase
      .from("interview_turns")
      .update({ answer: data.answer, score, evaluation: ev })
      .eq("id", turn.id);

    // Update topic rating
    const { data: r } = await supabase
      .from("topic_ratings")
      .select("*")
      .eq("topic", interview.topic)
      .maybeSingle();
    const oldRating = r ? Number(r.rating) : 5;
    const rating = updateRating(oldRating, score, turn.difficulty);
    const attempts = (r?.attempts ?? 0) + 1;
    const totalScore = Number(r?.total_score ?? 0) + score;
    const confidence = Math.min(100, Math.round(100 * (1 - Math.exp(-attempts / 6))));
    const mastery = Math.round((totalScore / attempts) * 10);
    const history = [
      ...((r?.history as { t: string; r: number }[] | null) ?? []),
      { t: new Date().toISOString(), r: rating },
    ].slice(-50);
    await supabase.from("topic_ratings").upsert(
      {
        user_id: userId,
        topic: interview.topic,
        rating,
        attempts,
        total_score: totalScore,
        confidence,
        mastery,
        history,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic" },
    );

    let next: { id: string; question: string; difficulty: string } | null = null;
    if (data.wantNext) {
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
      const { data: nt } = await supabase
        .from("interview_turns")
        .insert({ user_id: userId, interview_id: interview.id, question, difficulty: level })
        .select()
        .single();
      if (nt) next = { id: nt.id, question, difficulty: level };
    }
    return { evaluation: { ...ev, score }, rating, previousRating: oldRating, next };
  });

export const finishInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ interviewId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: turns } = await supabase
      .from("interview_turns")
      .select("id, score")
      .eq("interview_id", data.interviewId);
    const answered = (turns ?? []).filter((t) => t.score !== null);
    // drop the unanswered trailing question
    const unanswered = (turns ?? []).filter((t) => t.score === null).map((t) => t.id);
    if (unanswered.length) await supabase.from("interview_turns").delete().in("id", unanswered);
    const avg = answered.length
      ? answered.reduce((a, t) => a + Number(t.score), 0) / answered.length
      : null;
    await supabase
      .from("interviews")
      .update({
        completed_at: new Date().toISOString(),
        avg_score: avg === null ? null : Math.round(avg * 10) / 10,
      })
      .eq("id", data.interviewId);
    const { data: p } = await supabase.from("profiles").select("xp").eq("id", userId).maybeSingle();
    const gained = Math.round(answered.length * 10 + (avg ?? 0) * 5);
    await supabase
      .from("profiles")
      .update({ xp: (p?.xp ?? 0) + gained })
      .eq("id", userId);
    return { avg, answered: answered.length, xpGained: gained };
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
  hiddenTests: z.array(z.object({ input: z.string(), expected: z.string() })),
});
export type CodingProblem = z.infer<typeof problemSchema>;

export const generateCodingProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ topic: z.string().max(60), difficulty: z.enum(["easy", "medium", "hard"]) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return generateStructured(
      problemSchema,
      "You write LeetCode-style interview coding problems with precise statements and correct test cases.",
      `Create one ${data.difficulty} coding interview problem on ${data.topic}. Include 2 examples, 3-5 constraints, a function signature (no body, no boilerplate) for python, javascript, java and cpp using the same function name, and 6 hidden tests including edge cases, with inputs written as argument literals and expected outputs as literals.`,
    );
  });

const judgeSchema = z.object({
  tests: z.array(
    z.object({ input: z.string(), expected: z.string(), actual: z.string(), passed: z.boolean() }),
  ),
  compiles: z.boolean(),
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  edgeCases: z.string(),
  style: z.string(),
  improvements: z.array(z.string()),
  score: z.number(),
  summary: z.string(),
});
export type JudgeResult = z.infer<typeof judgeSchema>;

export const judgeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        problem: problemSchema,
        topic: z.string().max(60),
        language: z.enum(["python", "javascript", "java", "cpp"]),
        code: z.string().min(1).max(20000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const res = await generateStructured(
      judgeSchema,
      "You are a strict code judge. Mentally wrap the candidate code with any needed boilerplate (they may submit a full program or only the function), then trace it precisely on each test. Never assume correctness — simulate it. Score 0-10.",
      `Problem: ${data.problem.title}\n${data.problem.statement}\nLanguage: ${data.language}\nHidden tests: ${JSON.stringify(data.problem.hiddenTests)}\n\nCandidate code:\n\`\`\`\n${data.code}\n\`\`\`\nReturn the result of every hidden test, complexity analysis, edge case notes, style notes, suggested improvements and an overall score.`,
    );
    const score = Math.min(10, Math.max(0, res.score));
    await supabase.from("coding_submissions").insert({
      user_id: userId,
      problem: data.problem,
      language: data.language,
      code: data.code,
      result: res,
      score,
    });
    const topic = `Coding: ${data.topic}`;
    const { data: r } = await supabase
      .from("topic_ratings")
      .select("*")
      .eq("topic", topic)
      .maybeSingle();
    const attempts = (r?.attempts ?? 0) + 1;
    const total = Number(r?.total_score ?? 0) + score;
    const rating = updateRating(r ? Number(r.rating) : 5, score, "Medium+");
    await supabase.from("topic_ratings").upsert(
      {
        user_id: userId,
        topic,
        rating,
        attempts,
        total_score: total,
        mastery: Math.round((total / attempts) * 10),
        confidence: Math.min(100, Math.round(100 * (1 - Math.exp(-attempts / 6)))),
        history: [
          ...((r?.history as { t: string; r: number }[] | null) ?? []),
          { t: new Date().toISOString(), r: rating },
        ].slice(-50),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic" },
    );
    return { ...res, score };
  });

/* ---------------- Voice ---------------- */

export const transcribe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ audio: z.string().max(28_000_000), mime: z.string().max(60) }).parse(d),
  )
  .handler(async ({ data }) => ({ text: await transcribeAudio(data.audio, data.mime) }));
