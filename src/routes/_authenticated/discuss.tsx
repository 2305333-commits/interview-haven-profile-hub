import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { discuss } from "@/lib/ai.functions";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/discuss")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "AI Discussion — InterviewVerse" },
      {
        name: "description",
        content: "Talk through any concept, doubt or interview question with an AI mentor.",
      },
      { property: "og:title", content: "AI Discussion — InterviewVerse" },
      {
        property: "og:description",
        content: "Talk through any concept, doubt or interview question with an AI mentor.",
      },
    ],
  }),
  component: Discuss,
});

type Msg = { role: "user" | "assistant"; content: string };
const STARTERS = [
  "Explain how indexing speeds up a database query",
  "I don't get dynamic programming — where do I start?",
  "How should I answer 'Tell me about yourself'?",
  "What's the difference between a process and a thread?",
];

function Discuss() {
  const send = useServerFn(discuss);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function submit(content = text) {
    if (!content.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: content.trim() }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const r = await send({ data: { messages: next.slice(-40) } });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The mentor couldn't reply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Your study buddy" title="AI Discussion">
        {msgs.length > 0 && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setMsgs([])}>
            New chat
          </Button>
        )}
      </PageHeader>
      <div className="card-surface flex min-h-[50vh] flex-col p-4">
        <div className="flex-1 space-y-4">
          {msgs.length === 0 && (
            <div className="space-y-3 py-6 text-center">
              <p className="text-muted-foreground">Ask about anything you're studying. Try:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <p
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-xl bg-ink p-3 text-sm text-ink-foreground"
                  : "max-w-[90%] whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm leading-relaxed"
              }
            >
              {m.content}
            </p>
          ))}
          {busy && <p className="text-sm text-muted-foreground">Mentor is thinking…</p>}
          <div ref={end} />
        </div>
        <div className="mt-4 flex gap-2">
          <Textarea
            rows={2}
            value={text}
            placeholder="Type your question or thought… (Enter to send)"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button onClick={() => submit()} disabled={busy || !text.trim()}>
            Send
          </Button>
        </div>
      </div>
    </>
  );
}
