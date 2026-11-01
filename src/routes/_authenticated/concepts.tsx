import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { checkConceptAnswer, conceptLesson } from "@/lib/ai.functions";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/concepts")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Concept Practice — InterviewVerse" },
      { name: "description", content: "Learn a concept and practice it with fresh AI exercises." },
      { property: "og:title", content: "Concept Practice — InterviewVerse" },
      {
        property: "og:description",
        content: "Learn a concept and practice it with fresh AI exercises.",
      },
    ],
  }),
  component: Concepts,
});

const SUGGESTED = [
  "Deadlocks",
  "Database indexing",
  "TCP vs UDP",
  "Recursion",
  "Polymorphism",
  "Hash maps",
  "Caching",
  "Big-O",
];

type Lesson = {
  explanation: string;
  keyPoints: string[];
  exercises: { prompt: string; hint: string }[];
};
type Result = {
  verdict: "correct" | "partial" | "incorrect";
  score: number;
  feedback: string;
  modelAnswer: string;
};

function Concepts() {
  const lessonFn = useServerFn(conceptLesson);
  const checkFn = useServerFn(checkConceptAnswer);
  const [concept, setConcept] = useState("");
  const [level, setLevel] = useState<"easy" | "medium" | "hard">("medium");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [active, setActive] = useState(concept);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, Result>>({});
  const [hints, setHints] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load(c = concept) {
    if (busy) return;
    if (!c.trim()) {
      toast.error("Pick or type a concept");
      return;
    }
    setBusy("lesson");
    try {
      const l = await lessonFn({ data: { concept: c.trim(), level } });
      setLesson(l);
      setActive(c.trim());
      setAnswers({});
      setResults({});
      setHints({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
    } finally {
      setBusy(null);
    }
  }

  async function check(i: number) {
    const a = answers[i]?.trim();
    if (!a || !lesson || busy) return;
    setBusy(`ex${i}`);
    try {
      const r = await checkFn({
        data: { concept: active, exercise: lesson.exercises[i]?.prompt ?? "", answer: a },
      });
      setResults((rs) => ({ ...rs, [i]: r }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not check");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Learn by doing" title="Concept Practice" />
      <div className="card-surface mb-6 space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            placeholder="Any concept, e.g. Virtual memory"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) void load();
            }}
          />
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setLevel(d)}
              className={cn(
                "rounded-md border px-3 text-sm capitalize",
                level === d && "border-primary bg-primary/10",
              )}
            >
              {d}
            </button>
          ))}
          <Button onClick={() => load()} disabled={!!busy}>
            {busy === "lesson" ? "Preparing…" : lesson ? "New set" : "Start"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => {
                setConcept(s);
                load(s);
              }}
              disabled={!!busy}
              className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {lesson && (
        <div className="space-y-6">
          <div className="card-surface space-y-3 p-6">
            <h2 className="text-xl font-bold">{active}</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{lesson.explanation}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {lesson.keyPoints.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
          {lesson.exercises.map((ex, i) => {
            const r = results[i];
            return (
              <div key={i} className="card-surface space-y-3 p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-primary">
                  Exercise {i + 1}
                </p>
                <p className="font-medium">{ex.prompt}</p>
                <button
                  className="text-sm text-primary"
                  onClick={() => setHints((h) => ({ ...h, [i]: !h[i] }))}
                >
                  {hints[i] ? "Hide hint" : "Show hint"}
                </button>
                {hints[i] && <p className="rounded-lg bg-muted p-3 text-sm">💡 {ex.hint}</p>}
                <Textarea
                  rows={4}
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder="Your answer…"
                />
                <Button size="sm" onClick={() => check(i)} disabled={!!busy || !answers[i]?.trim()}>
                  {busy === `ex${i}` ? "Checking…" : r ? "Check again" : "Check answer"}
                </Button>
                {r && (
                  <div
                    className={cn(
                      "rounded-lg border-l-4 bg-muted p-4 text-sm",
                      r.verdict === "correct"
                        ? "border-l-success"
                        : r.verdict === "partial"
                          ? "border-l-accent"
                          : "border-l-destructive",
                    )}
                  >
                    <p className="font-semibold capitalize">
                      {r.verdict} · <span className="font-mono">{r.score.toFixed(1)}/10</span>
                    </p>
                    <p className="mt-1">{r.feedback}</p>
                    <p className="mt-2 text-muted-foreground">
                      <span className="font-medium text-foreground">Model answer: </span>
                      {r.modelAnswer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
