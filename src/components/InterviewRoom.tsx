import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mic, Square, Volume2 } from "lucide-react";
import { finishInterview, startInterview, submitAnswer, transcribe, type Evaluation } from "@/lib/ai.functions";
import { CATEGORIES } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Turn = { id: string; question: string; difficulty: string; answer?: string; evaluation?: Evaluation; rating?: number; prevRating?: number };

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  window.speechSynthesis.speak(u);
}

async function blobToBase64(b: Blob) {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export function InterviewRoom({ mode }: { mode: "text" | "voice" }) {
  const qc = useQueryClient();
  const start = useServerFn(startInterview);
  const submit = useServerFn(submitAnswer);
  const finish = useServerFn(finishInterview);
  const stt = useServerFn(transcribe);

  const [category, setCategory] = useState(CATEGORIES[0].id);
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const [topic, setTopic] = useState(cat.topics[0]);
  const [context, setContext] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [adaptive, setAdaptive] = useState(true);
  const [followUps, setFollowUps] = useState(true);
  const [count, setCount] = useState(5);

  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ avg: number | null; xpGained: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);

  const current = turns[turns.length - 1];
  const needsContext = category === "project" || category === "teach";

  async function begin() {
    if (needsContext && !context.trim()) return toast.error(category === "project" ? "Describe your project first" : "Tell us what concept you know");
    setBusy(true);
    try {
      const t = category === "teach" ? context.slice(0, 100) : category === "project" ? "Project Deep Dive" : topic;
      const res = await start({ data: { category, topic: t, difficulty, adaptive, followUps, mode, context: needsContext ? context : null } });
      setInterviewId(res.interviewId);
      setTurns([res.turn]);
      setSummary(null);
      if (mode === "voice") speak(res.turn.question);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!current || !answer.trim()) return;
    setBusy(true);
    try {
      const answeredCount = turns.length;
      const wantNext = answeredCount < count;
      const res = await submit({ data: { turnId: current.id, answer, wantNext } });
      setTurns((ts) => {
        const copy = [...ts];
        copy[copy.length - 1] = { ...current, answer, evaluation: res.evaluation, rating: res.rating, prevRating: res.previousRating };
        if (res.next) copy.push(res.next);
        return copy;
      });
      setAnswer("");
      if (res.next && mode === "voice") speak(res.next.question);
      if (!res.next) await end();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!interviewId) return;
    const r = await finish({ data: { interviewId } });
    setSummary({ avg: r.avg, xpGained: r.xpGained });
    window.speechSynthesis?.cancel();
    qc.invalidateQueries();
  }

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: mime });
        setBusy(true);
        try {
          const { text } = await stt({ data: { audio: await blobToBase64(blob), mime } });
          setAnswer((a) => (a ? a + " " : "") + text);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Transcription failed");
        } finally {
          setBusy(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access was blocked");
    }
  }

  if (!interviewId)
    return (
      <div className="card-surface space-y-6 p-6">
        <div>
          <Label>Category</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategory(c.id); setTopic(c.topics[0]); }}
                className={cn("rounded-lg border p-3 text-left text-sm transition", category === c.id ? "border-primary bg-primary/10" : "hover:bg-muted")}
              >
                <p className="font-semibold">{c.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
              </button>
            ))}
          </div>
        </div>
        {needsContext ? (
          <div>
            <Label>{category === "project" ? "Describe your project (stack, what it does, your role)" : "What concept do you know? e.g. \"I know how TCP works\""}</Label>
            <Textarea className="mt-2" rows={4} value={context} onChange={(e) => setContext(e.target.value)} />
          </div>
        ) : (
          <div>
            <Label>Topic</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {cat.topics.map((t) => (
                <button key={t} onClick={() => setTopic(t)} className={cn("rounded-full border px-3 py-1 text-sm", topic === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{t}</button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Starting difficulty</Label>
            <div className="mt-2 flex gap-1">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className={cn("flex-1 rounded-md border px-2 py-1.5 text-sm capitalize", difficulty === d ? "border-primary bg-primary/10" : "")}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Questions</Label>
            <Input className="mt-2" type="number" min={1} max={15} value={count} onChange={(e) => setCount(Math.max(1, Math.min(15, Number(e.target.value))))} />
          </div>
          <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">Adaptive mode <Switch checked={adaptive} onCheckedChange={setAdaptive} /></label>
          <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">Follow-ups <Switch checked={followUps} onCheckedChange={setFollowUps} /></label>
        </div>
        <Button size="lg" onClick={begin} disabled={busy}>{busy ? "Preparing your interviewer…" : "Start interview"}</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      {turns.map((t, i) => (
        <div key={t.id} className="space-y-3">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-primary">Q{i + 1} · {t.difficulty}</span>
              {mode === "voice" && <button onClick={() => speak(t.question)} aria-label="Replay"><Volume2 className="h-4 w-4 text-muted-foreground" /></button>}
            </div>
            <p className="mt-2 text-lg font-medium">{t.question}</p>
          </div>
          {t.answer && <p className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-xl bg-ink p-4 text-sm text-ink-foreground">{t.answer}</p>}
          {t.evaluation && <EvaluationCard ev={t.evaluation} rating={t.rating} prev={t.prevRating} />}
        </div>
      ))}

      {summary ? (
        <div className="card-surface p-6 text-center">
          <h2 className="text-2xl font-bold">Interview complete</h2>
          <p className="mt-2 text-muted-foreground">Average score <span className="font-mono font-semibold text-foreground">{summary.avg?.toFixed(1) ?? "—"}/10</span> · +{summary.xpGained} XP</p>
          <Button className="mt-4" onClick={() => { setInterviewId(null); setTurns([]); }}>New interview</Button>
        </div>
      ) : current && !current.answer ? (
        <div className="card-surface space-y-3 p-4">
          <Textarea rows={5} placeholder={mode === "voice" ? "Tap the mic and answer out loud…" : "Type your answer…"} value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button variant={recording ? "destructive" : "secondary"} onClick={toggleRecord} disabled={busy && !recording}>
                {recording ? <><Square className="mr-1 h-4 w-4" /> Stop</> : <><Mic className="mr-1 h-4 w-4" /> {mode === "voice" ? "Answer" : "Dictate"}</>}
              </Button>
              <Button variant="ghost" onClick={end} disabled={busy}>End interview</Button>
            </div>
            <Button onClick={send} disabled={busy || !answer.trim()}>{busy ? "Evaluating…" : "Submit answer"}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EvaluationCard({ ev, rating, prev }: { ev: Evaluation; rating?: number; prev?: number }) {
  const [open, setOpen] = useState(false);
  const bars: [string, number][] = [["Correctness", ev.correctness], ["Completeness", ev.completeness], ["Clarity", ev.clarity], ["Confidence", ev.confidence], ["Depth", ev.depth]];
  return (
    <div className="card-surface border-l-4 border-l-primary p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-2xl font-semibold">{ev.score.toFixed(1)}<span className="text-sm text-muted-foreground">/10</span></p>
        {rating !== undefined && prev !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">Level {prev.toFixed(1)} → <span className={rating >= prev ? "text-success" : "text-destructive"}>{rating.toFixed(1)}</span></span>
        )}
      </div>
      <p className="mt-2 text-sm">{ev.feedback}</p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {bars.map(([k, v]) => (
          <div key={k}>
            <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${Math.min(100, v * 10)}%` }} /></div>
            <p className="mt-1 text-[10px] text-muted-foreground">{k}</p>
          </div>
        ))}
      </div>
      {ev.missingConcepts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ev.missingConcepts.map((m) => <span key={m} className="rounded-full bg-warning/20 px-2 py-0.5 text-xs">{m}</span>)}
        </div>
      )}
      <button className="mt-3 text-sm text-primary" onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"} improved & ideal answer</button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <div><p className="font-semibold">Improved version of your answer</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{ev.improvedAnswer}</p></div>
          <div><p className="font-semibold">Ideal answer</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{ev.idealAnswer}</p></div>
        </div>
      )}
    </div>
  );
}
