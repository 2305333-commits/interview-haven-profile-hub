import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { InterviewRoom } from "@/components/InterviewRoom";

export const Route = createFileRoute("/_authenticated/voice")({
  head: () => ({ meta: [{ title: "Voice Interview — InterviewVerse" }, { name: "description", content: "Speak your answers to an AI interviewer." }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Speak, don't type" title="Voice Interview" />
      <p className="mb-6 text-sm text-muted-foreground">The interviewer reads each question aloud. Tap Answer, speak, then Stop — your words are transcribed and you can edit before submitting. Your spoken delivery is scored too.</p>
      <InterviewRoom mode="voice" />
    </>
  ),
});
