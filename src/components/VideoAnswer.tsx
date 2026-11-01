import { useEffect, useRef, useState } from "react";
import { Camera, Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { recordingAudio, type VideoEvidence } from "@/lib/video-interview";

export function VideoAnswer({
  disabled,
  onChange,
}: {
  disabled: boolean;
  onChange: (evidence: VideoEvidence | null) => void;
}) {
  const preview = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    recorder = useRef<MediaRecorder | null>(null);
  const frames = useRef<string[]>([]),
    mounted = useRef(true);
  const [ready, setReady] = useState(false),
    [recording, setRecording] = useState(false),
    [processing, setProcessing] = useState(false);
  const [url, setUrl] = useState<string | null>(null),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(0);
  const [consent, setConsent] = useState(false),
    [setting, setSetting] = useState<VideoEvidence["setting"]>("professional");
  const [evidence, setEvidence] = useState<Omit<VideoEvidence, "setting" | "consent"> | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (preview.current && ready) {
      preview.current.srcObject = url ? null : stream.current;
      if (url) preview.current.load();
    }
  }, [ready, url]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  useEffect(() => {
    onChange(
      consent && evidence && !recording && !processing
        ? { ...evidence, setting, consent: true }
        : null,
    );
  }, [consent, evidence, setting, recording, processing, onChange]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(
      () =>
        setSeconds((s) => {
          if (s >= 119) recorder.current?.stop();
          return s + 1;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [recording]);
  function capture() {
    const video = preview.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = Math.round((video.videoHeight * 640) / video.videoWidth);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL("image/jpeg", 0.7);
    if (frames.current.length < 3) frames.current.push(frame);
    else frames.current = [frames.current[0] ?? frame, frames.current[2] ?? frame, frame];
  }
  async function enable() {
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = media;
      setReady(true);
    } catch {
      setError("Camera or microphone access was blocked. Allow both to record an answer.");
    }
  }
  function record() {
    const media = stream.current;
    if (!media) return;
    window.speechSynthesis?.cancel();
    setError("");
    setEvidence(null);
    setSeconds(0);
    frames.current = [];
    capture();
    try {
      const mime = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((m) =>
        MediaRecorder.isTypeSupported(m),
      );
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      const sampling = setInterval(capture, 15000);
      rec.onstop = async () => {
        clearInterval(sampling);
        capture();
        if (!mounted.current) return;
        setRecording(false);
        setProcessing(true);
        const blob = new Blob(chunks, { type: rec.mimeType });
        setUrl(URL.createObjectURL(blob));
        try {
          const audio = await recordingAudio(blob);
          if (!mounted.current) return;
          if (!frames.current.length)
            throw new Error("The camera image could not be captured. Please retry.");
          setEvidence({ audio, frames: [...frames.current] });
        } catch (e) {
          if (mounted.current)
            setError(
              e instanceof Error ? e.message : "Recording could not be prepared. Please retry.",
            );
        } finally {
          if (mounted.current) setProcessing(false);
        }
      };
      rec.start();
      setRecording(true);
    } catch {
      setError(
        "Video recording is not supported in this browser. Try Chrome or use Voice Interview.",
      );
    }
  }
  return (
    <section className="space-y-3" aria-label="Video answer">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Interview setting</p>
        <div className="flex gap-1">
          {(["professional", "smart-casual"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={setting === s ? "secondary" : "ghost"}
              disabled={disabled || recording}
              onClick={() => setSetting(s)}
            >
              {s === "professional" ? "Professional" : "Smart casual"}
            </Button>
          ))}
        </div>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-ink text-ink-foreground">
        {ready ? (
          <video
            ref={preview}
            src={url ?? undefined}
            autoPlay={!url}
            muted={!url}
            controls={!!url}
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Camera className="h-8 w-8" />
            <Button variant="secondary" onClick={enable} disabled={disabled}>
              Enable camera & microphone
            </Button>
          </div>
        )}
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={consent}
          disabled={disabled || recording}
          onCheckedChange={(v) => setConsent(v === true)}
        />
        <span>
          I agree to send my recorded audio and sampled camera images for AI feedback when I submit.
          Raw recordings are not saved to my account.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {ready && !url && (
          <Button
            onClick={() => (recording ? recorder.current?.stop() : record())}
            variant={recording ? "destructive" : "secondary"}
            disabled={disabled || processing || !consent}
          >
            {recording ? <Square /> : <Mic />}
            {recording ? "Stop recording" : "Record answer"}
          </Button>
        )}
        {url && (
          <Button
            variant="outline"
            disabled={disabled || processing || recording}
            onClick={() => {
              setUrl(null);
              setEvidence(null);
              setError("");
            }}
          >
            <RotateCcw />
            Retry recording
          </Button>
        )}
        <span role="status" className="font-mono text-xs text-muted-foreground">
          {processing
            ? "Preparing recording…"
            : recording
              ? `Recording · ${seconds}s / 120s`
              : evidence
                ? "Recording ready"
                : ""}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
