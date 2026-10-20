import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Gauge, Mic, MessagesSquare, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InterviewVerse — Adaptive AI interview prep" },
      {
        name: "description",
        content:
          "Practice CS, DSA, behavioral and coding interviews with an AI that adapts to your level and tracks your growth.",
      },
      { property: "og:title", content: "InterviewVerse — Adaptive AI interview prep" },
      {
        property: "og:description",
        content: "An AI interviewer, tutor and evaluator that adapts to your real skill level.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Gauge,
    title: "Adaptive difficulty",
    body: "Easy to Expert. Every answer moves your per-topic rating, like an SAT for interviews.",
  },
  {
    icon: MessagesSquare,
    title: "Real interviewer feel",
    body: "Follow-ups, project deep dives and a teaching mode that probes what you actually know.",
  },
  {
    icon: Code2,
    title: "Coding rounds",
    body: "Write the full program or just the function. Hidden tests, complexity and style feedback.",
  },
  {
    icon: Mic,
    title: "Voice mode",
    body: "The AI asks out loud, you answer on the mic, and your delivery gets scored too.",
  },
  {
    icon: Target,
    title: "Strengths & gaps",
    body: "Evolving tags show exactly what to study next — Deadlocks, SQL joins, DP memoization.",
  },
  {
    icon: Sparkles,
    title: "Ideal answers",
    body: "Every answer comes back with feedback, an improved version and the ideal answer.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <section className="bg-hero text-ink-foreground">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-6">
          <nav className="flex items-center justify-between">
            <Logo />
            <div className="flex gap-2">
              <Button
                asChild
                variant="ghost"
                className="text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </div>
          </nav>
          <div className="mt-24 max-w-3xl animate-rise">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              AI interviewer · tutor · evaluator
            </p>
            <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">
              Walk in ready.
              <br />
              Walk out <em className="text-accent not-italic">hired.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-foreground/75">
              InterviewVerse runs adaptive mock interviews across CS fundamentals, DSA, behavioral
              and coding — then tells you precisely where you stand.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-10 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/auth" search={{ mode: "signup" }}>
                Start practicing free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-20 max-w-3xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-ink-foreground/50">
              Sample skill report
            </p>
            <div className="grid grid-cols-2 gap-x-10 gap-y-4 font-mono text-sm sm:grid-cols-4">
              {(
                [
                  ["DSA", 6.5, true],
                  ["OS", 7.3, true],
                  ["DBMS", 3.8, false],
                  ["Behavioral", 7.1, true],
                ] as const
              ).map(([t, v, up]) => (
                <div key={t} className="border-l-2 border-accent/60 pl-3">
                  <p className="text-ink-foreground/60">{t}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    Lv {v}{" "}
                    <span className={up ? "text-sm text-primary" : "text-sm text-accent"}>
                      {up ? "↑" : "↓"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">What you get</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">
          Everything a real interview throws at you, in one place.
        </h2>
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start practicing free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} InterviewVerse
      </footer>
    </div>
  );
}
