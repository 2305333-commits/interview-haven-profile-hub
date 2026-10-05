import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ mode: z.enum(["signin", "signup", "forgot"]).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — InterviewVerse" },
      { name: "description", content: "Sign in or create your InterviewVerse account." },
      { property: "og:title", content: "Sign in — InterviewVerse" },
      { property: "og:description", content: "Sign in or create your InterviewVerse account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initial } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initial ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) setSent("Check your email to confirm your account, then sign in.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setSent("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-hero hidden flex-col justify-between p-10 text-ink-foreground lg:flex">
        <Link to="/"><Logo /></Link>
        <blockquote className="max-w-md text-3xl font-bold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          "Explain TCP." — "What's the 3-way handshake?" — "Why not UDP?"
          <span className="mt-4 block text-base font-normal text-ink-foreground/70">Depth, discovered one follow-up at a time.</span>
        </blockquote>
        <span />
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-rise">
          <Link to="/" className="lg:hidden"><Logo /></Link>
          <h1 className="mt-6 text-3xl font-bold">
            {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}
          </h1>
          {sent ? (
            <p className="mt-6 rounded-lg bg-secondary p-4 text-sm">{sent}</p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button type="button" className="text-xs text-primary" onClick={() => setMode("forgot")}>Forgot password?</button>
                    )}
                  </div>
                  <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              )}
              <Button className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </Button>
            </form>
          )}
          {mode !== "forgot" && !sent && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
            </>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>Have an account? <button className="text-primary" onClick={() => { setMode("signin"); setSent(null); }}>Sign in</button></>
            ) : (
              <>New here? <button className="text-primary" onClick={() => { setMode("signup"); setSent(null); }}>Create an account</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
