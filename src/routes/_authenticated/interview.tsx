import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { InterviewRoom } from "@/components/InterviewRoom";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({
    meta: [
      { property: "og:title", content: "AI Interview — InterviewVerse" },
      { property: "og:description", content: "Adaptive AI mock interview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "AI Interview — InterviewVerse" },
      { name: "description", content: "Adaptive AI mock interview." },
    ],
  }),
  component: () => (
    <>
      <PageHeader eyebrow="Mock interview room" title="AI Interview" />
      <InterviewRoom mode="text" />
    </>
  ),
});
