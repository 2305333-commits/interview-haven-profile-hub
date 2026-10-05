import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Gauge, Mic, MessagesSquare, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InterviewVerse — Adaptive AI interview prep" },
      { name: "description", content: "Practice CS, DSA, behavioral and coding interviews with an AI that adapts to your level and tracks your growth." },
      { property: "og:title", content: "InterviewVerse — Adaptive AI interview prep" },
      { property: "og:description", content: "An AI interviewer, tutor and evaluator that adapts to your real skill level." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Gauge, title: "Adaptive difficulty", body: "Easy to Expert. Every answer moves your per-topic rating, like an SAT for interviews." },
  { icon: MessagesSquare, title: "Real interviewer feel", body: "Follow-ups, project deep dives and a teaching mode that probes what you actually know." },
  { icon: Code2, title: "Coding rounds", body: "Write the full program or just the function. Hidden tests, complexity and style feedback." },
  { icon: Mic, title: "Voice mode", body: "The AI asks out loud, you answer on the mic, and your delivery gets scored too." },
  { icon: Target, title: "Strengths & gaps", body: "Evolving tags show exactly what to study next — Deadlocks, SQL joins, DP memoization." },
  { icon: Sparkles, title: "Ideal answers", body: "Every answer comes back with feedback, an improved version and the ideal answer." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <section className="bg-hero text-ink-foreground">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-6">
          <nav className="flex items-center justify-between">
            <Logo />
            <div className="flex gap-2">
              <Button asChild variant="ghost" className="text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
              </Button>
            </div>
          </nav>
          <div className="mt-24 max-w-3xl animate-rise">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">AI interviewer · tutor · evaluator</p>
            <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">
              Find out what you <em className="text-accent not-italic">really</em> know before they do.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-foreground/75">
              InterviewVerse runs adaptive mock interviews across CS fundamentals, DSA, behavioral and coding — then tells you
              precisely where you stand.
            </p>
            <Button asChild size="lg" className="mt-10 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start practicing free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-20 grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-4">
            {[["DSA", "6.5 ↑"], ["OS", "7.3 ↑"], ["DBMS", "3.8 ↓"], ["Behavioral", "7.1 ↑"]].map(([t, v]) => (
              <div key={t} className="rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-4">
                <p className="text-ink-foreground/60">{t}</p>
                <p className="mt-1 text-2xl font-semibold">Lv {v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card-surface p-6">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} InterviewVerse</footer>
    </div>
  );
}
