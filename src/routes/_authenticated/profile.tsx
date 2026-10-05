import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { profileCompletion, profileQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — InterviewVerse" }, { name: "description", content: "Edit your profile and resume." }] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const { data: p } = useQuery(profileQuery);
  const [form, setForm] = useState({ full_name: "", college: "", graduation_year: "", target_role: "", skills: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (p)
      setForm({
        full_name: p.full_name ?? "",
        college: p.college ?? "",
        graduation_year: p.graduation_year?.toString() ?? "",
        target_role: p.target_role ?? "",
        skills: p.skills.join(", "),
      });
  }, [p]);

  if (!p) return <p className="text-muted-foreground">Loading…</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        college: form.college || null,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
        target_role: form.target_role || null,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      })
      .eq("id", p!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function upload(file: File) {
    if (file.type !== "application/pdf") return toast.error("Please upload a PDF");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10 MB");
    const path = `${p!.id}/resume.pdf`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ resume_path: path }).eq("id", p!.id);
    toast.success("Resume uploaded");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function viewResume() {
    const { data } = await supabase.storage.from("resumes").createSignedUrl(p!.resume_path!, 60);
    if (data) window.open(data.signedUrl, "_blank");
  }

  const completion = profileCompletion(p);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader eyebrow="Account" title="Your profile" />
      <div className="card-surface mb-6 p-5">
        <div className="flex justify-between text-sm"><span>{p.email}</span><span className="font-mono">{completion}% complete</span></div>
        <Progress value={completion} className="mt-3" />
      </div>
      <form onSubmit={save} className="card-surface grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Full name"><Input value={form.full_name} onChange={set("full_name")} /></Field>
        <Field label="College"><Input value={form.college} onChange={set("college")} /></Field>
        <Field label="Graduation year"><Input type="number" min={1980} max={2040} value={form.graduation_year} onChange={set("graduation_year")} /></Field>
        <Field label="Target role"><Input placeholder="SDE Intern, Backend Engineer…" value={form.target_role} onChange={set("target_role")} /></Field>
        <div className="sm:col-span-2"><Field label="Skills (comma separated)"><Input placeholder="Java, React, SQL" value={form.skills} onChange={set("skills")} /></Field></div>
        <div className="sm:col-span-2"><Button disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button></div>
      </form>
      <div className="card-surface mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <p className="font-medium">Resume</p>
            <p className="text-xs text-muted-foreground">{p.resume_path ? "Uploaded" : "No resume yet — PDF, max 10 MB"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {p.resume_path && <Button variant="outline" onClick={viewResume}>View</Button>}
          <Button asChild variant="secondary">
            <label className="cursor-pointer">
              <Upload className="mr-1 h-4 w-4" /> {p.resume_path ? "Replace" : "Upload"}
              <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
