import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, fmtTime, questionsQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Written Practice — InterviewVerse" },
      { name: "description", content: "Timed written practice with self-rating." },
    ],
  }),
  component: Practice,
});

type Q = { id: string; text: string; tips: string | null; difficulty: string };

function Practice() {
  const categories = useQuery(categoriesQuery).data ?? [];
  const questions = useQuery(questionsQuery).data ?? [];
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cat, setCat] = useState<string | null>(null);
  const [count, setCount] = useState(5);
  const [limit, setLimit] = useState(300);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [list, setList] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [tips, setTips] = useState(false);

  useEffect(() => {
    if (!sessionId) return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [sessionId, i]);

  async function start() {
    const pool = questions
      .filter((q) => !cat || q.category_id === cat)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    if (!pool.length) {
      toast.error("No questions in this category");
      return;
    }
    const name = categories.find((c) => c.id === cat)?.name ?? "Mixed";
    const { data, error } = await supabase
      .from("sessions")
      .insert({ title: `${name} practice`, category_id: cat })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSessionId(data.id);
    setList(pool);
    setI(0);
    setElapsed(0);
  }

  async function next() {
    if (!text.trim()) {
      toast.error("Write an answer first");
      return;
    }
    const { error } = await supabase.from("answers").insert({
      session_id: sessionId!,
      question_id: list[i]!.id,
      body: text,
      self_rating: rating,
      notes: notes || null,
      time_spent_seconds: elapsed,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    setRating(null);
    setNotes("");
    setTips(false);
    setElapsed(0);
    if (i < list.length - 1) setI(i + 1);
    else {
      await supabase
        .from("sessions")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", sessionId!);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      navigate({ to: "/sessions/$id", params: { id: sessionId! } });
    }
  }

  if (sessionId && list[i]) {
    const q = list[i];
    const over = elapsed > limit;
    return (
      <>
        <PageHeader
          eyebrow={`Question ${i + 1} of ${list.length} · ${q.difficulty}`}
          title="Written practice"
        >
          <span className={cn("font-mono text-lg", over && "text-destructive")}>
            {fmtTime(elapsed)} / {fmtTime(limit)}
          </span>
        </PageHeader>
        <div className="card-surface space-y-4 p-6">
          <p className="text-xl font-semibold">{q.text}</p>
          {q.tips && (
            <button className="text-sm text-primary" onClick={() => setTips(!tips)}>
              {tips ? "Hide tip" : "Show tip"}
            </button>
          )}
          {tips && <p className="rounded-lg bg-muted p-3 text-sm">💡 {q.tips}</p>}
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your answer…"
          />
          <div className="flex items-center gap-1 text-sm">
            Self-rating:
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star
                  className={cn(
                    "h-5 w-5",
                    rating && n <= rating ? "fill-accent text-accent" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Private notes (optional)"
          />
          <Button onClick={next}>{i < list.length - 1 ? "Save & next" : "Finish session"}</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Self-paced" title="Written Practice" />
      <div className="card-surface space-y-5 p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              !cat && "border-primary bg-primary text-primary-foreground",
            )}
          >
            Mixed
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                cat === c.id && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label>
            Questions{" "}
            <select
              className="ml-2 h-9 rounded-md border bg-background px-2"
              value={count}
              onChange={(e) => setCount(+e.target.value)}
            >
              {[3, 5, 8, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Time per question{" "}
            <select
              className="ml-2 h-9 rounded-md border bg-background px-2"
              value={limit}
              onChange={(e) => setLimit(+e.target.value)}
            >
              {[120, 300, 600].map((n) => (
                <option key={n} value={n}>
                  {n / 60} min
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button onClick={start}>Start session</Button>
      </div>
    </>
  );
}
