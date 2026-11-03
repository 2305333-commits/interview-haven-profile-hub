import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queueRetry } from "@/components/EvaluatingNotice";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EvaluationCard } from "@/components/InterviewRoom";
import type { Evaluation } from "@/lib/ai.functions";

const interviewQuery = (id: string) => queryOptions({ queryKey: ["interview-review", id], queryFn: async () => {
  const [interview, turns] = await Promise.all([
    supabase.from("interviews").select("*").eq("id", id).maybeSingle(),
    supabase.from("interview_turns").select("*").eq("interview_id", id).order("created_at"),
  ]);
  if (interview.error || turns.error) throw new Error("Could not load interview feedback.");
  return { interview: interview.data, turns: turns.data ?? [] };
} });
export const Route = createFileRoute("/_authenticated/interviews/$id")({
  head: () => ({ meta: [
    { title: "Interview Feedback — InterviewVerse" }, { name: "description", content: "Review saved interview answers, scores, and recorded delivery feedback." },
    { property: "og:title", content: "Interview Feedback — InterviewVerse" }, { property: "og:description", content: "Your saved InterviewVerse interview feedback." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(interviewQuery(params.id)),
  component: InterviewReview,
});
const MODE_ROUTE = { text: "/interview", voice: "/voice", video: "/video", written: "/practice" } as const;
function InterviewReview() {
  const { id } = Route.useParams(); const { data } = useSuspenseQuery(interviewQuery(id));
  const navigate = useNavigate();
  if (!data.interview) return <p>Interview not found. <Link to="/sessions" className="text-primary">Back to history</Link></p>;
  const iv = data.interview;
  const retry = (question: string) => {
    queueRetry({ question, topic: iv.topic, category: iv.category });
    void navigate({ to: MODE_ROUTE[iv.mode as keyof typeof MODE_ROUTE] ?? "/interview" });
  };
  return <><PageHeader eyebrow={`${iv.mode} interview`} title={iv.topic}><Link to="/sessions" className="text-sm text-primary">All sessions</Link></PageHeader>
    <div className="space-y-6">{data.turns.map((turn, index) => <section key={turn.id} className="space-y-3"><p className="font-mono text-xs text-primary">Q{index + 1} · {turn.difficulty}</p><h2 className="text-lg font-semibold">{turn.question}</h2>{turn.answer && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{turn.answer}</p>}{turn.evaluation && <EvaluationCard ev={turn.evaluation as unknown as Evaluation} />}<Button variant="outline" size="sm" onClick={() => retry(turn.question)}><RotateCcw className="mr-1 h-4 w-4" /> Try this question again</Button></section>)}</div></>;
}