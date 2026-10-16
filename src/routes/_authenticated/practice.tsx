import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { InterviewRoom } from "@/components/InterviewRoom";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Written Practice — InterviewVerse" },
      { name: "description", content: "Timed written answers to fresh AI-written questions." },
      { property: "og:title", content: "Written Practice — InterviewVerse" },
      { property: "og:description", content: "Timed written answers to fresh AI-written questions." },
    ],
  }),
  component: () => (
    <>
      <PageHeader eyebrow="Write it out" title="Written Practice" />
      <p className="mb-6 text-sm text-muted-foreground">
        Every question is written fresh by the AI each time — nothing is picked from a list. Take
        your time, write a full answer, and get scored feedback with a model answer.
      </p>
      <InterviewRoom mode="written" />
    </>
  ),
});
