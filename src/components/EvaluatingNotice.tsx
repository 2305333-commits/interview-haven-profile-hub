import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/** Clear "we're working on it" panel so users know the app hasn't frozen. */
export function EvaluatingNotice({ steps, title = "Evaluating your answer" }: { steps: string[]; title?: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const step = steps[Math.min(steps.length - 1, Math.floor(secs / 3))];
  return (
    <div role="status" aria-live="polite" className="card-surface flex items-start gap-3 border-primary/40 p-4">
      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {title}… <span className="font-mono text-xs text-muted-foreground">{secs}s</span>
        </p>
        <p className="text-sm text-muted-foreground">{step}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The app is working — this usually takes 5–15 seconds. Your feedback will appear right below.
        </p>
      </div>
    </div>
  );
}

const RETRY_KEY = "iv-retry-question";
export type RetryRequest = { question: string; topic: string; category: string };
export function queueRetry(r: RetryRequest) {
  sessionStorage.setItem(RETRY_KEY, JSON.stringify(r));
}
export function takeRetry(): RetryRequest | null {
  const raw = sessionStorage.getItem(RETRY_KEY);
  sessionStorage.removeItem(RETRY_KEY);
  try {
    return raw ? (JSON.parse(raw) as RetryRequest) : null;
  } catch {
    return null;
  }
}
