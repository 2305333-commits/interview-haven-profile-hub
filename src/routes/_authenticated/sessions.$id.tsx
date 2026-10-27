import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtTime } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sessions/$id")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Session — InterviewVerse" },
      { property: "og:description", content: "Review your practice session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Session — InterviewVerse" },
      { name: "description", content: "Review your practice session." },
    ],
  }),
  component: SessionDetail,
});

function SessionDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const [s, a] = await Promise.all([
        supabase.from("sessions").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("answers")
          .select("*, question:questions(text, tips)")
          .eq("session_id", id)
          .order("created_at"),
      ]);
      return { session: s.data, answers: a.data ?? [] };
    },
  });
  const [edit, setEdit] = useState<string | null>(null);
  const [r, setR] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  if (!data.session)
    return (
      <p>
        Session not found.{" "}
        <Link to="/sessions" className="text-primary">
          Back
        </Link>
      </p>
    );
  const rated = data.answers.filter((a) => a.self_rating);
  const avg = rated.length ? rated.reduce((s, a) => s + a.self_rating!, 0) / rated.length : 0;
  const time = data.answers.reduce((s, a) => s + a.time_spent_seconds, 0);

  async function save(aid: string) {
    await supabase
      .from("answers")
      .update({ self_rating: r, notes: notes || null })
      .eq("id", aid);
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["session", id] });
  }

  return (
    <>
      <PageHeader eyebrow="Session review" title={data.session.title}>
        <Link to="/sessions" className="text-sm text-primary">
          ← All sessions
        </Link>
      </PageHeader>
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          ["Answers", data.answers.length],
          ["Avg rating", avg ? avg.toFixed(1) : "—"],
          ["Time", fmtTime(time)],
        ].map(([k, v]) => (
          <div key={k} className="card-surface p-4">
            <p className="font-mono text-2xl font-semibold">{v}</p>
            <p className="text-xs text-muted-foreground">{k}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {data.answers.map((a) => (
          <div key={a.id} className="card-surface p-5">
            <p className="font-semibold">{a.question?.text}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
            {edit === a.id ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setR(n)}>
                      <Star
                        className={cn(
                          "h-5 w-5",
                          r && n <= r ? "fill-accent text-accent" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  ))}
                </div>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(a.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {a.self_rating ? "★".repeat(a.self_rating) : "Unrated"} ·{" "}
                  {fmtTime(a.time_spent_seconds)} {a.notes && `· ${a.notes}`}
                </span>
                <button
                  className="text-primary"
                  onClick={() => {
                    setEdit(a.id);
                    setR(a.self_rating);
                    setNotes(a.notes ?? "");
                  }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
