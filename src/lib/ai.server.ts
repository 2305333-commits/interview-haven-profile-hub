import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import type { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway/gateway-helpers.server";

const GATEWAY = "https://ai.gateway.lovable.dev";
export const CHAT_MODEL = "openai/gpt-6-astra";
export const EVALUATION_MODEL = "google/gemini-3.8-flash";

export async function generateEvaluation<T>(key: string, schema: z.ZodType<T>, instructions: string, prompt: string): Promise<T> {
  const gateway = createLovableAiGatewayProvider(key, undefined, { baseURL: GATEWAY, structuredOutputs: true });
  const result = streamText({ model: gateway(EVALUATION_MODEL), system: instructions, prompt, output: Output.object({ schema }), maxRetries: 0 });
  try { return await result.output as T; }
  catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) throw new Error("The evaluation returned an unexpected result. Your answer has been kept.");
    throw error;
  }
}

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  return key;
}

function provider() {
  const key = apiKey();
  let runId: string | undefined;
  return createOpenAI({
    baseURL: `${GATEWAY}/v1`,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      if (res.status === 402)
        throw new Error("AI credits are exhausted. Please add credits to continue.");
      if (res.status === 429)
        throw new Error("Too many AI requests right now. Please wait a moment and try again.");
      return res;
    },
  });
}

/** Streams a structured-output call server-side and returns the parsed object. */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  instructions: string,
  prompt: string,
  pdf?: { filename: string; base64: string },
): Promise<T> {
  const content = pdf
    ? [
        { type: "text" as const, text: prompt },
        {
          type: "file" as const,
          filename: pdf.filename,
          data: pdf.base64,
          mediaType: "application/pdf",
        },
      ]
    : prompt;
  const result = streamText({
    model: provider().responses(CHAT_MODEL),
    instructions,
    messages: [{ role: "user", content }],
    output: Output.object({ schema }),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return (await result.output) as T;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      throw new Error("The AI returned an unexpected response. Please try again.");
    }
    throw e;
  }
}

export async function transcribeAudio(base64: string, mime: string): Promise<string> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (!bytes.length || bytes.length > 20 * 1024 * 1024)
    throw new Error("Recording is empty or too large.");
  const type = mime.startsWith("video/webm") ? "audio/webm" : mime || "audio/webm";
  const form = new FormData();
  form.append("model", "openai/gpt-transcribe");
  form.append(
    "file",
    new Blob([bytes], { type }),
    type.includes("wav") ? "answer.wav" : "answer.webm",
  );
  form.append("response_format", "json");
  const res = await fetch(`${GATEWAY}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "X-Lovable-AIG-SDK": "fetch" },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("Transcription failed", res.status, text);
    throw new Error(`Transcription failed (${res.status}).`);
  }
  try {
    return (JSON.parse(text).text as string) ?? "";
  } catch {
    return text;
  }
}
