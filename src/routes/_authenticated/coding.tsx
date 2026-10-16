import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  generateCodingProblem,
  judgeCode,
  type CodingProblem,
  type JudgeResult,
} from "@/lib/ai.functions";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coding")({
  head: () => ({
    meta: [
      { title: "Coding — InterviewVerse" },
      { name: "description", content: "LeetCode-style coding practice judged by AI." },
    ],
  }),
  component: Coding,
});

const TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Backtracking",
  "Hashing",
];
const LANGS = [
  ["python", "Python"],
  ["javascript", "JavaScript"],
  ["java", "Java"],
  ["cpp", "C++"],
] as const;
type Lang = (typeof LANGS)[number][0];

function Coding() {
  const gen = useServerFn(generateCodingProblem);
  const judge = useServerFn(judgeCode);
  const [topic, setTopic] = useState<string>(TOPICS[0]!);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [lang, setLang] = useState<Lang>("python");
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [busy, setBusy] = useState<"gen" | "judge" | null>(null);

  async function newProblem() {
    setBusy("gen");
    setResult(null);
    try {
      const p = await gen({ data: { topic, difficulty } });
      setProblem(p);
      setCode(p.signatures[lang] + "\n");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function run() {
    if (!problem) return;
    setBusy("judge");
    try {
      setResult(await judge({ data: { problem, topic, language: lang, code } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Judging failed");
    } finally {
      setBusy(null);
    }
  }

  const passed = result?.tests.filter((t) => t.passed).length ?? 0;

  return (
    <>
      <PageHeader eyebrow="Coding round" title="Coding practice" />
      <div className="card-surface mb-6 flex flex-wrap items-end gap-4 p-5">
        <Select
          label="Topic"
          value={topic}
          onChange={setTopic}
          options={TOPICS.map((t) => [t, t])}
        />
        <Select
          label="Difficulty"
          value={difficulty}
          onChange={(v) => setDifficulty(v as typeof difficulty)}
          options={[
            ["easy", "Easy"],
            ["medium", "Medium"],
            ["hard", "Hard"],
          ]}
        />
        <Select
          label="Language"
          value={lang}
          onChange={(v) => {
            setLang(v as Lang);
            if (problem && !result) setCode(problem.signatures[v as Lang] + "\n");
          }}
          options={LANGS.map(([a, b]) => [a, b])}
        />
        <Button onClick={newProblem} disabled={!!busy}>
          {busy === "gen" ? "Generating…" : problem ? "New problem" : "Get a problem"}
        </Button>
      </div>

      {problem && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-surface space-y-4 p-5 text-sm">
            <h2 className="text-xl font-bold">{problem.title}</h2>
            <p className="whitespace-pre-wrap">{problem.statement}</p>
            {problem.examples.map((ex, i) => (
              <div key={i} className="rounded-lg bg-muted p-3 font-mono text-xs">
                <p>Input: {ex.input}</p>
                <p>Output: {ex.output}</p>
                {ex.explanation && <p className="mt-1 text-muted-foreground">{ex.explanation}</p>}
              </div>
            ))}
            <ul className="list-disc pl-5 text-muted-foreground">
              {problem.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Write the whole program or only the function — both work. {problem.hiddenTests.length}{" "}
              hidden tests.
            </p>
          </div>
          <div className="space-y-3">
            <textarea
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const s = el.selectionStart;
                  setCode(code.slice(0, s) + "    " + code.slice(el.selectionEnd));
                  requestAnimationFrame(() => (el.selectionStart = el.selectionEnd = s + 4));
                }
              }}
              className="h-[420px] w-full resize-y rounded-xl bg-ink p-4 font-mono text-sm text-ink-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <Button className="w-full" onClick={run} disabled={!!busy || !code.trim()}>
              {busy === "judge" ? "Running hidden tests…" : "Submit"}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="card-surface mt-6 space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-bold">
              {passed}/{result.tests.length} tests passed
            </p>
            <p className="font-mono text-2xl font-semibold">{result.score.toFixed(1)}/10</p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Ran for real · {result.status}
            {result.timeSec !== null && ` · ${result.timeSec}s total`}
            {result.memoryKb !== null && ` · ${Math.round(result.memoryKb / 1024)} MB`}
          </p>
          {result.error && (
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-destructive">
              {result.error}
            </pre>
          )}
          <p className="text-sm">{result.summary}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.tests.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-3 font-mono text-xs",
                  t.passed ? "border-success/40" : "border-destructive/40",
                )}
              >
                <p className="flex items-center gap-1 font-sans text-sm font-medium">
                  {t.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}{" "}
                  Test {i + 1}
                </p>
                <p className="mt-1 break-all">in: {t.input}</p>
                <p>expected: {t.expected}</p>
                {!t.passed && <p>got: {t.actual}</p>}
              </div>
            ))}
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <b>Time:</b> {result.timeComplexity}
            </p>
            <p>
              <b>Space:</b> {result.spaceComplexity}
            </p>
            <p>
              <b>Edge cases:</b> {result.edgeCases}
            </p>
            <p>
              <b>Style:</b> {result.style}
            </p>
          </div>
          {result.improvements.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {result.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border bg-background px-2"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
