import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { interviewsQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({
    meta: [
      { title: "History — InterviewVerse" },
      { name: "description", content: "Your past sessions and interviews." },
    ],
  }),
  component: Sessions,
});

function Sessions() {
  const qc = useQueryClient();
  const sessions =
    useQuery({
      queryKey: ["sessions"],
      queryFn: async () =>
        (
          await supabase
            .from("sessions")
            .select("*, category:categories(name), answers(count)")
            .order("started_at", { ascending: false })
        ).data ?? [],
    }).data ?? [];
  const interviews = useQuery(interviewsQuery).data ?? [];

  async function del(id: string) {
    if (!confirm("Delete this session?")) return;
    await supabase.from("sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  }

  return (
    <>
      <PageHeader eyebrow="History" title="Your sessions" />
      <h2 className="mb-3 text-xl font-bold">AI interviews</h2>
      <div className="card-surface mb-10 divide-y">
        {interviews.map((i) => (
          <div key={i.id} className="flex justify-between p-4 text-sm">
            <span>
              {i.topic}{" "}
              <span className="text-muted-foreground">
                · {i.mode} · {new Date(i.created_at).toLocaleDateString()}
              </span>
            </span>
            <span className="font-mono">
              {i.avg_score !== null ? `${Number(i.avg_score).toFixed(1)}/10` : "in progress"}
            </span>
          </div>
        ))}
        {interviews.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No AI interviews yet.</p>
        )}
      </div>
      <h2 className="mb-3 text-xl font-bold">Written practice</h2>
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
