import { z } from "zod";

/**
 * Backup AI provider: used only when the Lovable AI Gateway reports that
 * workspace credits are exhausted (402) or blocked by a credit limit (403).
 */
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
// Primary free-tier model, then a lighter one when Google is overloaded.
const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const PAUSE_MS = 10 * 60 * 1000;
let creditsOutUntil = 0;

export function geminiAvailable() {
  return !!process.env["GEMINI_API_KEY"];
}

/** True while we recently saw Lovable credits run out, so we skip straight to Gemini. */
export function lovableCreditsPaused() {
  return geminiAvailable() && Date.now() < creditsOutUntil;
}

export function isCreditError(e: unknown): boolean {
  const err = e as { statusCode?: number; status?: number; message?: string; cause?: unknown };
  const status = err?.statusCode ?? err?.status;
  if (status === 402) return true;
  const msg = String(err?.message ?? "").toLowerCase();
  if (status === 403 && /credit|limit/.test(msg)) return true;
  if (/credits? (are )?exhausted|insufficient (ai )?credits|credit_limit|payment required/.test(msg))
    return true;
  return err?.cause ? isCreditError(err.cause) : false;
}

/** Runs the Lovable call; on a credit error (and when a Gemini key exists) runs the fallback. */
export async function withGeminiFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  if (lovableCreditsPaused()) return fallback();
  try {
    return await primary();
  } catch (e) {
    if (!geminiAvailable() || !isCreditError(e)) throw e;
    creditsOutUntil = Date.now() + PAUSE_MS;
    console.warn("Lovable AI credits exhausted; switching to Gemini fallback.");
    return fallback();
  }
}

type Part = Record<string, unknown>;

async function geminiChat(content: string | Part[], system?: string, json = true): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("AI credits are exhausted. Please add credits to continue.");
  let last = "";
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content },
          ],
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      const text = await res.text();
      if (res.ok) {
        const out = JSON.parse(text)?.choices?.[0]?.message?.content;
        if (typeof out === "string" && out.trim()) return out;
        last = "empty response";
        break;
      }
      last = `${res.status} ${text.slice(0, 200)}`;
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
        continue;
      }
      break;
    }
  }
  console.error("Gemini fallback failed", last);
  if (last.startsWith("429"))
    throw new Error("Too many AI requests right now. Please wait a minute and try again.");
  throw new Error("The AI is busy right now. Please try again in a moment.");
}

function parseJson(text: string) {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
}

export async function geminiStructured<T>(
  schema: z.ZodType<T>,
  instructions: string,
  prompt: string,
  pdf?: { filename: string; base64: string },
): Promise<T> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const system = `${instructions}\n\nRespond ONLY with a JSON object matching this JSON Schema:\n${jsonSchema}`;
  const content: string | Part[] = pdf
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdf.base64}` } },
      ]
    : prompt;
  const out = await geminiChat(content, system);
  try {
    return schema.parse(parseJson(out));
  } catch {
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}

/** Raw multimodal JSON call (used by video assessment). */
export async function geminiJson(content: Part[]): Promise<string> {
  return geminiChat(content);
}

export async function geminiTranscribe(base64: string, mime: string): Promise<string> {
  const format = mime.includes("wav") ? "wav" : mime.includes("mp4") || mime.includes("m4a") ? "mp4" : "webm";
  return geminiChat(
    [
      { type: "text", text: "Transcribe this spoken answer verbatim. Return only the transcript text." },
      { type: "input_audio", input_audio: { data: base64, format } },
    ],
    undefined,
    false,
  );
}
