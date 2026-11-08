import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, MessagesSquare, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NAV, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { SkillRadar } from "@/components/SkillRadar";
import { PracticeRewards } from "@/components/PracticeRewards";
import {
  aggregateTags,
  interviewsQuery,
  profileCompletion,
  profileQuery,
  ratingsQuery,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — InterviewVerse" },
      { name: "description", content: "Your interview prep progress." },
      { property: "og:title", content: "Dashboard — InterviewVerse" },
      { property: "og:description", content: "Your interview prep progress and practice options." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const profile = useQuery(profileQuery).data;
  const ratings = useQuery(ratingsQuery).data ?? [];
  const interviews = useQuery(interviewsQuery).data ?? [];
  const evals =
    useQuery({
      queryKey: ["evals"],
      queryFn: async () => {
        const { data } = await supabase
          .from("interview_turns")
          .select("evaluation")
          .not("evaluation", "is", null)
          .order("created_at", { ascending: false })
          .limit(60);
        return (data ?? []).map(
          (d) => d.evaluation as { strengths?: string[]; weaknesses?: string[] },
        );
      },
    }).data ?? [];
  const tags = aggregateTags(evals);
  const completion = profileCompletion(profile ?? null);
  const done = interviews.filter((i) => i.completed_at);
  const xp = profile?.xp ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hey ${profile?.full_name?.split(" ")[0] ?? "there"} 👋`}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Start practicing <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)]">
            <DropdownMenuLabel>Choose your practice</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NAV.filter(({ to }) => to !== "/dashboard" && to !== "/sessions" && to !== "/profile").map(
              ({ to, label, icon: Icon }) => (
                <DropdownMenuItem key={to} asChild className="cursor-pointer gap-3 py-3">
                  <Link to={to}>
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {completion < 100 && (
        <Link to="/profile" className="card-surface mb-6 block p-5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Profile {completion}% complete</span>
            <span className="text-primary">Finish profile →</span>
          </div>
          <Progress value={completion} className="mt-3" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={MessagesSquare} label="Interviews" value={done.length} />
        <Stat icon={Zap} label="XP" value={xp} />
        <Stat icon={Trophy} label="Level" value={Math.floor(xp / 250) + 1} />
      </div>

      <PracticeRewards />

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Skill map</h2>
        {ratings.length === 0 ? (
          <p className="card-surface p-6 text-sm text-muted-foreground">
            Answer a few interview questions and your topic levels will show up here.
          </p>
        ) : (
          <>
          <div className="mb-4">
            <SkillRadar ratings={ratings} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ratings.map((r) => {
              const h = (r.history as { r: number }[]) ?? [];
              const prev = h[h.length - 2]?.r ?? Number(r.rating);
              const up = Number(r.rating) >= prev;
              return (
                <div key={r.id} className="card-surface p-5">
                  <p className="text-sm text-muted-foreground">{r.topic}</p>
                  <p className="mt-1 flex items-center gap-2 font-mono text-3xl font-semibold">
                    {Number(r.rating).toFixed(1)}
                    {up ? (
                      <ArrowUp className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowDown className="h-5 w-5 text-destructive" />
                    )}
                  </p>
                  <Sparkline values={h.map((x) => x.r)} />
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Accuracy {Number(r.mastery)}%</span>
                    <span>Confidence {Number(r.confidence)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <TagBox title="Strengths" tags={tags.strengths} tone="bg-success/15 text-success" />
        <TagBox
          title="Practice next"
          tags={tags.weaknesses}
          tone="bg-destructive/10 text-destructive"
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Recent interviews</h2>
        <div className="card-surface divide-y">
          {interviews.slice(0, 8).map((i) => (
            <div key={i.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">{i.topic}</p>
                <p className="text-xs text-muted-foreground">
                  {i.mode === "voice" ? "Voice · " : ""}
                  {new Date(i.created_at).toLocaleString()}
                </p>
              </div>
              <span className="font-mono">
                {i.avg_score !== null ? `${Number(i.avg_score).toFixed(1)}/10` : "—"}
              </span>
            </div>
          ))}
          {interviews.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No interviews yet.</p>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: number }) {
  return (
    <div className="card-surface p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 font-mono text-3xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TagBox({ title, tags, tone }: { title: string; tags: string[]; tone: string }) {
  return (
    <div className="card-surface p-5">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.length ? (
          tags.map((t) => (
            <span key={t} className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
              {t}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">Not enough data yet.</span>
        )}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="mt-3 h-8" />;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / 10) * 30}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="mt-3 h-8 w-full" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
