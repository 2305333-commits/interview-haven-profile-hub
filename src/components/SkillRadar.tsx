import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

type Rating = { topic: string; rating: number | string };

/** Ratings are 0–10; readiness is their average as a percentage. */
export function readiness(ratings: Rating[]) {
  if (ratings.length === 0) return 0;
  const avg = ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length;
  return Math.round(Math.min(100, Math.max(0, avg * 10)));
}

export function readinessLabel(pct: number) {
  if (pct >= 80) return "Strong hire";
  if (pct >= 60) return "Interview ready";
  if (pct >= 35) return "Developing";
  return "Needs foundation";
}

export function SkillRadar({ ratings }: { ratings: Rating[] }) {
  const pct = readiness(ratings);
  const data = ratings.map((r) => ({ topic: r.topic, level: Number(Number(r.rating).toFixed(1)) }));
  const weakest = [...ratings].sort((a, b) => Number(a.rating) - Number(b.rating))[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className="card-surface flex flex-col justify-center p-6">
        <p className="text-sm text-muted-foreground">Interview readiness</p>
        <p className="mt-1 font-mono text-5xl font-semibold text-primary">{pct}%</p>
        <span className="mt-3 w-fit rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
          {readinessLabel(pct)}
        </span>
        {weakest && (
          <p className="mt-4 text-sm text-muted-foreground">
            Practice <span className="font-medium text-foreground">{weakest.topic}</span> next to
            raise your score.
          </p>
        )}
      </div>
      <div className="card-surface h-72 p-2">
        {data.length < 3 ? (
          <p className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Practice at least 3 topics to unlock your skill radar.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Radar dataKey="level" name="Level (0–10)" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
