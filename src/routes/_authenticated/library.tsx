import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { categoriesQuery, questionsQuery } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Question Library — InterviewVerse" }, { name: "description", content: "Browse curated interview questions." }] }),
  component: Library,
});

const DIFF = { easy: "bg-success/15 text-success", medium: "bg-warning/25 text-accent-foreground", hard: "bg-destructive/10 text-destructive" } as Record<string, string>;

function Library() {
  const categories = useQuery(categoriesQuery).data ?? [];
  const questions = useQuery(questionsQuery).data ?? [];
  const [search, setSearch] = useState("");
  const [diff, setDiff] = useState("all");
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(
    () => questions.filter((q) => (!cat || q.category_id === cat) && (diff === "all" || q.difficulty === diff) && q.text.toLowerCase().includes(search.toLowerCase())),
    [questions, cat, diff, search],
  );

  return (
    <>
      <PageHeader eyebrow={`${questions.length} questions`} title="Question Library" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {["all", "easy", "medium", "hard"].map((d) => (
          <button key={d} onClick={() => setDiff(d)} className={cn("rounded-md border px-3 text-sm capitalize", diff === d && "border-primary bg-primary/10")}>{d}</button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setCat(null)} className={cn("rounded-full border px-3 py-1 text-sm", !cat && "border-primary bg-primary text-primary-foreground")}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={cn("rounded-full border px-3 py-1 text-sm", cat === c.id && "border-primary bg-primary text-primary-foreground")}>{c.name}</button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((q) => (
          <button key={q.id} onClick={() => setOpen(open === q.id ? null : q.id)} className="card-surface block w-full p-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{q.text}</p>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs capitalize", DIFF[q.difficulty])}>{q.difficulty}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{q.category?.name} · ~{q.estimated_minutes} min</p>
            {open === q.id && q.tips && <p className="mt-3 rounded-lg bg-muted p-3 text-sm">💡 {q.tips}</p>}
          </button>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No questions match.</p>}
      </div>
    </>
  );
}
