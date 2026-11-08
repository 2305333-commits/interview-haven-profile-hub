import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, Flame, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ratingsQuery } from "@/lib/data";
import { quizActivityQuery } from "@/lib/practice-activity";
import { dailyStreak, ratingEvents, topicBadges } from "@/lib/practice-rewards";

export function PracticeRewards() {
  const ratings = useQuery(ratingsQuery);
  const quizzes = useQuery(quizActivityQuery);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const events = [...ratingEvents(ratings.data ?? []), ...(quizzes.data ?? [])];
  const badges = topicBadges(events);
  const streak = dailyStreak(events, now);
  const loading = ratings.isPending || quizzes.isPending;
  const failed = ratings.isError || quizzes.isError;

  return (
    <section className="mt-10 border-y border-border py-6" aria-labelledby="rewards-heading">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="rewards-heading" className="text-xl font-bold">Badges & daily streak</h2>
        {!loading && !failed && <span className="text-sm text-muted-foreground">{badges.length} topic{badges.length === 1 ? "" : "s"} practiced</span>}
      </div>
      {loading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your achievements…</p>
      ) : failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Your achievements couldn’t load.</p>
          <Button variant="outline" size="sm" onClick={() => { void ratings.refetch(); void quizzes.refetch(); }}>Try again</Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-warning" aria-hidden="true" />
              <p className="font-mono text-3xl font-semibold">{streak.current}<span className="ml-2 font-sans text-sm font-normal text-muted-foreground">day streak</span></p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{streak.practicedToday ? "Today’s practice is done." : streak.current > 0 ? "Keep your streak alive today." : "A fresh start. Make today count."}</p>
            <div className="mt-5 grid grid-cols-7 gap-2" aria-label="Practice over the last seven days">
              {streak.week.map(({ date, practiced, today }) => (
                <div key={date.toISOString()} className="flex min-w-0 flex-col items-center gap-2" aria-label={`${date.toLocaleDateString()}: ${practiced ? "practiced" : "not practiced"}${today ? ", today" : ""}`}>
                  <span className="text-xs text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${practiced ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"} ${today ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}>
                    {practiced ? <Check className="h-4 w-4" aria-hidden="true" /> : date.getDate()}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Trophy className="h-4 w-4 text-warning" /> Best streak: {streak.best} day{streak.best === 1 ? "" : "s"} · Local time</p>
          </div>
          <div className="min-w-0">
            {badges.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {badges.map((badge) => (
                  <li key={badge.topic.toLowerCase()} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground"><Award className="h-6 w-6" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{badge.topic}</p>
                      <p className="text-xs text-primary">Practiced</p>
                      <p className="mt-1 text-xs text-muted-foreground">Earned {new Date(badge.earnedAt).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No badges yet. Your first topic is waiting.</p>}
          </div>
        </div>
      )}
    </section>
  );
}