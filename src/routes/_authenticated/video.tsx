import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { InterviewRoom } from "@/components/InterviewRoom";

export const Route = createFileRoute("/_authenticated/video")({
  head: () => ({ meta: [
    { title: "Video Interview — InterviewVerse" },
    { name: "description", content: "Practice recorded interview answers with feedback on content, audible delivery, and interview presentation." },
    { property: "og:title", content: "Video Interview — InterviewVerse" },
    { property: "og:description", content: "Camera-based interview practice with combined answer, audio, and presentation feedback." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <><PageHeader eyebrow="Camera practice" title="Video Interview" /><InterviewRoom mode="video" /></>,
});