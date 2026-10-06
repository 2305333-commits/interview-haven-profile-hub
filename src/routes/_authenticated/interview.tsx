import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { InterviewRoom } from "@/components/InterviewRoom";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({ meta: [{ title: "AI Interview — InterviewVerse" }, { name: "description", content: "Adaptive AI mock interview." }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Mock interview room" title="AI Interview" />
      <InterviewRoom mode="text" />
    </>
  ),
});
