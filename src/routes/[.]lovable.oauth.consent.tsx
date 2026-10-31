import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppShell";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [{ title: "Connect an app — InterviewVerse" }, { name: "description", content: "Approve or decline an assistant connection to your own InterviewVerse history and skill ratings." }, { property: "og:title", content: "Connect an app — InterviewVerse" }, { property: "og:description", content: "Manage assistant access to your own interview practice data." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its authorization ID.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
    return { email: data.session.user.email ?? "" };
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id");
    if (!id) throw new Error("This connection link is missing its authorization ID.");
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message || "This connection request expired or is invalid.");
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Shell>
      <h1 className="text-2xl font-bold">Couldn't load this connection request</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <Logo />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function Consent() {
  const details = Route.useLoaderData();
  const { email } = Route.useRouteContext();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "An app";
  const scopes = String(details?.scope ?? "").split(/\s+/).filter(Boolean);
  const label = (s: string) =>
    s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : s === "openid" ? "Confirm who you are" : `Additional permission requested: ${s}`;

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve ? await oauth().approveAuthorization(authorization_id) : await oauth().denyAuthorization(authorization_id);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) throw new Error(error?.message ?? "No redirect was returned. Please try again.");
      window.location.href = target;
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed. Please retry."); setBusy(false); }
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold">Connect {client} to InterviewVerse</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {client} will be able to read your skill ratings and interview history while acting as you.
      </p>
      <p className="mt-4 text-sm">Signed in as <span className="font-medium">{email}</span></p>
      {details?.redirect_uri && <p className="mt-1 break-all text-xs text-muted-foreground">Returns to {details.redirect_uri}</p>}
      {scopes.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">{scopes.map((s) => <li key={s}>{label(s)}</li>)}</ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">This does not bypass this app's permissions — it only sees your own data.</p>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex gap-3">
        <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Approve</Button>
        <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
      </div>
    </Shell>
  );
}
