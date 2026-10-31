import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz } from "@/lib/ai.functions";
import { fmtTime } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Quick Quiz — InterviewVerse" },
      { property: "og:description", content: "AI-generated multiple choice quizzes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Quick Quiz — InterviewVerse" },
      { name: "description", content: "AI-generated multiple choice quizzes." },
    ],
  }),
  component: Quiz,
});

const TOPICS = [
  "Operating Systems",
  "DBMS",
  "Computer Networks",
  "OOP",
  "DSA",
  "System Design",
  "JavaScript",
  "Python",
  "General Knowledge",
  "Mixed Challenge",
];
const COUNTS = [5, 10, 15, 20];
type Q = { question: string; options: string[]; correctIndex: number; explanation: string };

function Quiz() {
  const gen = useServerFn(generateQuiz);
  const qc = useQueryClient();
  const [topic, setTopic] = useState<string>(TOPICS[0] ?? "Operating Systems");
  const [custom, setCustom] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(10);
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);

  const history =
    useQuery({
      queryKey: ["quiz_results"],
      queryFn: async () => {
        const { data, error } = await supabase.from("quiz_results").select("*").order("created_at", { ascending: false }).limit(20);
        if (error) throw new Error(error.message);
        return data ?? [];
      },
    }).data ?? [];

  useEffect(() => {
    if (!qs || done) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [qs, done]);

  const finalTopic = custom.trim() || topic;

  async function begin() {
    setBusy(true);
    try {
      const q = await gen({ data: { topic: finalTopic, difficulty, count } });
      if (!q.length) throw new Error("No questions were generated. Please try again.");
      setQs(q);
      setI(0);
      setAnswers(new Array(q.length).fill(-1));
      setDone(false);
      setSecs(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!qs || busy) return;
    setBusy(true);
    const score = qs.reduce((a, q, k) => a + (answers[k] === q.correctIndex ? 1 : 0), 0);
    const { error } = await supabase.from("quiz_results").insert({
      topic: finalTopic,
      difficulty,
      score,
      total_questions: qs.length,
      time_spent_seconds: secs,
      question_count: count,
    });
    setBusy(false);
    if (error) { toast.error("Could not save your quiz. Your answers are kept; press Finish to retry."); return; }
    setDone(true);
    qc.invalidateQueries({ queryKey: ["quiz_results"] });
  }

  if (qs && !done) {
    const q = qs[i];
    if (!q) return null;
    return (
      <>
        <PageHeader
          eyebrow={`${finalTopic} · ${difficulty}`}
          title={`Question ${i + 1} of ${qs.length}`}
        >
          <span className="font-mono">{fmtTime(secs)}</span>
        </PageHeader>
        <div className="card-surface p-6">
          <p className="text-lg font-medium">{q.question}</p>
          <div className="mt-5 grid gap-2">
            {q.options.map((o, k) => (
              <button
                key={k}
                onClick={() => setAnswers((a) => a.map((v, j) => (j === i ? k : v)))}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm",
                  answers[i] === k ? "border-primary bg-primary/10" : "hover:bg-muted",
                )}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
              Back
            </Button>
            {i < qs.length - 1 ? (
              <Button onClick={() => setI(i + 1)}>Next</Button>
            ) : (
              <Button onClick={complete} disabled={busy}>{busy ? "Saving…" : "Finish"}</Button>
            )}
          </div>
        </div>
      </>
    );
  }

  if (qs && done) {
    const score = qs.reduce((a, q, k) => a + (answers[k] === q.correctIndex ? 1 : 0), 0);
    return (
      <>
        <PageHeader eyebrow="Results" title={`${score}/${qs.length} correct`}>
          <Button onClick={() => setQs(null)}>New quiz</Button>
        </PageHeader>
        <p className="mb-6 text-muted-foreground">
          {Math.round((score / qs.length) * 100)}% in {fmtTime(secs)}
        </p>
        <div className="space-y-3">
          {qs.map((q, k) => (
            <div
              key={k}
              className={cn(
                "card-surface border-l-4 p-4 text-sm",
                answers[k] === q.correctIndex ? "border-l-success" : "border-l-destructive",
              )}
            >
              <p className="font-medium">{q.question}</p>
              <p className="mt-1">
                Correct: {q.options[q.correctIndex]}
                {answers[k] !== q.correctIndex && (
                  <span className="text-muted-foreground">
                    {" "}
                    · You: {q.options[answers[k] ?? -1] ?? "—"}
                  </span>
                )}
              </p>
              <p className="mt-1 text-muted-foreground">{q.explanation}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Warm up" title="Quick Quiz" />
      <div className="card-surface space-y-5 p-6">
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTopic(t);
                setCustom("");
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                topic === t && !custom
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Input
          placeholder="…or type any topic"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <div className="flex flex-wrap gap-6">
          <div className="flex gap-1">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm capitalize",
                  difficulty === d && "border-primary bg-primary/10",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-sm",
                  count === c && "border-primary bg-primary/10",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={begin} disabled={busy}>
          {busy ? "Generating questions…" : "Start quiz"}
        </Button>
      </div>
      <h2 className="mb-3 mt-10 text-xl font-bold">Quiz history</h2>
      <div className="card-surface divide-y">
        {history.map((h) => (
          <div key={h.id} className="flex justify-between p-4 text-sm">
            <span>
              {h.topic} <span className="text-muted-foreground">· {h.difficulty}</span>
            </span>
            <span className="font-mono">
              {h.score}/{h.total_questions} · {fmtTime(h.time_spent_seconds)}
            </span>
          </div>
        ))}
        {history.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No quizzes yet.</p>
        )}
      </div>
    </>
  );
}
