import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { generateResumeQuestions } from "@/lib/ai.functions";
import { profileQuery } from "@/lib/data";

const resumeQuestionsQuery = queryOptions({
  queryKey: ["resume_questions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("resume_questions")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

export const Route = createFileRoute("/_authenticated/resume-questions")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Resume Questions — InterviewVerse" },
      { property: "og:description", content: "Interview questions generated from your resume." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Resume Questions — InterviewVerse" },
      { name: "description", content: "Interview questions generated from your resume." },
    ],
  }),
  component: ResumeQuestions,
});

function ResumeQuestions() {
  const qc = useQueryClient();
  const gen = useServerFn(generateResumeQuestions);
  const { data: profile } = useQuery(profileQuery);
  const { data: qs = [], error, refetch } = useQuery(resumeQuestionsQuery);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  async function build() {
    setBusy(true);
    try {
      const r = await gen({ data: { count: 15 } });
      toast.success(`${r.count} questions created from your resume`);
      qc.invalidateQueries({ queryKey: ["resume_questions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read your resume");
    } finally {
      setBusy(false);
    }
  }

  const kinds = ["all", ...new Set(qs.map((q) => q.kind))];
  const shown = filter === "all" ? qs : qs.filter((q) => q.kind === filter);

  return (
    <>
      <PageHeader eyebrow="Built from your resume" title="Resume Questions" />
      <div className="card-surface mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          {profile?.resume_path
            ? qs.length
              ? `${qs.length} saved resume examples. Interviews use their topics to write fresh questions, not reuse these prompts.`
              : "Your resume is uploaded. Extract its interview topics and example questions."
            : "Upload a resume on your Profile first."}
        </p>
        <div className="flex gap-2">
          {profile?.resume_path ? (
            <Button onClick={build} disabled={busy}>
              {busy ? "Reading your resume…" : qs.length ? "Rebuild questions" : "Build questions"}
            </Button>
          ) : (
            <Button asChild>
              <Link to="/profile">Go to Profile</Link>
            </Button>
          )}
          {qs.length > 0 && (
            <Button asChild variant="secondary">
              <Link to="/interview">Practice in AI Interview</Link>
            </Button>
          )}
        </div>
      </div>
      {qs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1 text-sm capitalize ${filter === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {k}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert">
          Could not load resume questions. <Button onClick={() => refetch()}>Retry</Button>
        </p>
      )}
      <div className="space-y-3">
        {shown.map((q) => (
          <div key={q.id} className="card-surface p-4">
            <div className="flex flex-wrap gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <span className="text-primary">{q.topic}</span>·<span>{q.kind}</span>·
              <span>{q.difficulty}</span>
            </div>
            <p className="mt-2 font-medium">{q.question}</p>
            <p className="mt-1 text-xs text-muted-foreground">From: {q.resume_item}</p>
          </div>
        ))}
      </div>
    </>
  );
}
