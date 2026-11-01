import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { InterviewRoom } from "@/components/InterviewRoom";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Written Practice — InterviewVerse" },
      {
        name: "description",
        content: "Written answers to fresh AI-written questions with scored feedback.",
      },
      { property: "og:title", content: "Written Practice — InterviewVerse" },
      {
        property: "og:description",
        content: "Written answers to fresh AI-written questions with scored feedback.",
      },
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
