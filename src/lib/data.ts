import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    return data ? { ...data, email: u.user.email ?? "" } : null;
  },
});

export const ratingsQuery = queryOptions({
  queryKey: ["ratings"],
  queryFn: async () => {
    const { data } = await supabase
      .from("topic_ratings")
      .select("*")
      .order("rating", { ascending: false });
    return data ?? [];
  },
});

export const interviewsQuery = queryOptions({
  queryKey: ["interviews"],
  queryFn: async () => {
    const { data } = await supabase
      .from("interviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    return data ?? [];
  },
});

export const questionsQuery = queryOptions({
  queryKey: ["questions"],
  queryFn: async () => {
    const { data } = await supabase
      .from("questions")
      .select("*, category:categories(*)")
      .order("created_at");
    return data ?? [];
  },
});

export function profileCompletion(
  p: {
    full_name: string | null;
    college: string | null;
    graduation_year: number | null;
    target_role: string | null;
    skills: string[];
    resume_path: string | null;
  } | null,
) {
  if (!p) return 0;
  const checks = [
    p.full_name,
    p.college,
    p.graduation_year,
    p.target_role,
    p.skills.length > 0,
    p.resume_path,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function aggregateTags(evals: { strengths?: string[]; weaknesses?: string[] }[]) {
  const s = new Map<string, number>();
  const w = new Map<string, number>();
  for (const e of evals) {
    e.strengths?.forEach((t) => s.set(t, (s.get(t) ?? 0) + 1));
    e.weaknesses?.forEach((t) => w.set(t, (w.get(t) ?? 0) + 1));
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k);
  return { strengths: top(s), weaknesses: top(w) };
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
