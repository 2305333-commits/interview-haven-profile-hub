import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  MessagesSquare,
  Code2,
  Mic,
  Library,
  PenLine,
  History,
  Brain,
  UserRound,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/interview", label: "AI Interview", icon: MessagesSquare },
  { to: "/coding", label: "Coding", icon: Code2 },
  { to: "/voice", label: "Voice Interview", icon: Mic },
  { to: "/quiz", label: "Quick Quiz", icon: Brain },
  { to: "/resume-questions", label: "Resume Questions", icon: FileText },
  { to: "/library", label: "Question Library", icon: Library },
  { to: "/practice", label: "Written Practice", icon: PenLine },
  { to: "/sessions", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-xl font-extrabold tracking-tight", className)}>
      Interview<span className="text-accent">Verse</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent !text-sidebar-primary font-medium" }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col justify-between bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <div className="space-y-8">
          <Link to="/dashboard">
            <Logo />
          </Link>
          {nav}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <Logo className="text-lg" />
        <button onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-12 z-20 space-y-4 bg-sidebar p-4 lg:hidden">
          {nav}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/70"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl animate-rise">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
