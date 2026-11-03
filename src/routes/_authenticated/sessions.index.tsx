import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { interviewsQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({
    meta: [
      { property: "og:title", content: "History — InterviewVerse" },
      { property: "og:description", content: "Your past sessions and interviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "History — InterviewVerse" },
      { name: "description", content: "Your past sessions and interviews." },
    ],
  }),
  component: Sessions,
});

function Sessions() {
  const qc = useQueryClient();
  const sessionsResult = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, category:categories(name), answers(count)")
        .order("started_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const interviewsResult = useQuery(interviewsQuery);
  const coding =
    useQuery({
      queryKey: ["coding-history"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("coding_submissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw new Error(error.message);
        return data ?? [];
      },
    }).data ?? [];
  const quizzes =
    useQuery({
      queryKey: ["quiz-history"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("quiz_results")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw new Error(error.message);
        return data ?? [];
      },
    }).data ?? [];
  const sessions = sessionsResult.data ?? [];
  const interviews = interviewsResult.data ?? [];

  async function del(id: string) {
    if (!confirm("Delete this session?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the session. Please retry.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["sessions"] });
  }

  return (
    <>
      <PageHeader eyebrow="History" title="Your sessions" />
      {(sessionsResult.error || interviewsResult.error) && (
        <p role="alert">
          Could not load history.{" "}
          <Button
            onClick={() => {
              sessionsResult.refetch();
              interviewsResult.refetch();
            }}
          >
            Retry
          </Button>
        </p>
      )}
      <h2 className="mb-3 text-xl font-bold">AI interviews & written practice</h2>
      <div className="card-surface mb-10 divide-y">
        {interviews.map((i) => (
          <div key={i.id} className="flex justify-between p-4 text-sm">
            <Link
              to="/interviews/$id"
              params={{ id: i.id }}
              className="min-w-0 flex-1 hover:text-primary"
            >
              {i.topic}{" "}
              <span className="text-muted-foreground">
                · {i.mode} · {new Date(i.created_at).toLocaleDateString()}
              </span>
            </Link>
            <span className="font-mono">
              {i.avg_score !== null ? `${Number(i.avg_score).toFixed(1)}/10` : "in progress"}
            </span>
          </div>
        ))}
        {interviews.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No AI interviews yet.</p>
        )}
      </div>
      <h2 className="mb-3 text-xl font-bold">Coding submissions</h2>
      <div className="card-surface mb-10 divide-y">
        {coding.map((c) => {
          const p = c.problem as { title?: string; topic?: string } | null;
          const r = c.result as { tests?: { passed: boolean }[]; summary?: string } | null;
          const passed = r?.tests?.filter((t) => t.passed).length ?? 0;
          return (
            <details key={c.id} className="p-4 text-sm">
              <summary className="flex cursor-pointer justify-between gap-2">
                <span>
                  {p?.title ?? "Coding problem"}{" "}
                  <span className="text-muted-foreground">
                    · {c.language} · {new Date(c.created_at).toLocaleDateString()}
                    {r?.tests ? ` · ${passed}/${r.tests.length} tests` : ""}
                  </span>
                </span>
                <span className="font-mono">{c.score !== null ? `${Number(c.score).toFixed(1)}/10` : "—"}</span>
              </summary>
              {r?.summary && <p className="mt-2 text-muted-foreground">{r.summary}</p>}
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-ink p-3 font-mono text-xs text-ink-foreground">{c.code}</pre>
            </details>
          );
        })}
        {coding.length === 0 && <p className="p-4 text-sm text-muted-foreground">No coding submissions yet.</p>}
      </div>
      <h2 className="mb-3 text-xl font-bold">Quiz results</h2>
      <div className="card-surface mb-10 divide-y">
        {quizzes.map((q) => (
          <div key={q.id} className="flex justify-between p-4 text-sm">
            <span>
              {q.topic}{" "}
              <span className="text-muted-foreground">
                · {q.difficulty} · {q.created_at ? new Date(q.created_at).toLocaleDateString() : ""}
              </span>
            </span>
            <span className="font-mono">{q.score}/{q.total_questions}</span>
          </div>
        ))}
        {quizzes.length === 0 && <p className="p-4 text-sm text-muted-foreground">No quizzes yet.</p>}
      </div>
      <h2 className="mb-3 text-xl font-bold">Earlier practice sessions</h2>
      <div className="card-surface divide-y">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 text-sm">
            <Link to="/sessions/$id" params={{ id: s.id }} className="flex-1">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {(s.answers as unknown as { count: number }[])[0]?.count ?? 0} answers ·{" "}
                {new Date(s.started_at!).toLocaleString()} {s.completed_at ? "" : "· unfinished"}
              </p>
            </Link>
            <button onClick={() => del(s.id)} aria-label="Delete">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No practice sessions yet.</p>
        )}
      </div>
    </>
  );
}
