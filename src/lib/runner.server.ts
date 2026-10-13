// Runs code for real on Judge0 CE (RapidAPI). Server-only.
const HOST = "judge0-ce.p.rapidapi.com";
const LANG_ID = { python: 71, javascript: 63, java: 62, cpp: 54 } as const;

export type RunOutput = {
  status: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeSec: number | null;
  memoryKb: number | null;
};

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string | null) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

export async function runCode(language: keyof typeof LANG_ID, source: string): Promise<RunOutput> {
  const key = process.env["JUDGE0_API_KEY"];
  if (!key) throw new Error("The code runner isn't set up yet (missing Judge0 key).");
  const res = await fetch(
    `https://${HOST}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,status,time,memory`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": HOST,
      },
      body: JSON.stringify({
        language_id: LANG_ID[language],
        source_code: b64(source),
        cpu_time_limit: 5,
        memory_limit: 256000,
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("Judge0 failed", res.status, text);
    if (res.status === 429) throw new Error("Daily code-run limit reached. Try again later.");
    if (res.status === 401 || res.status === 403)
      throw new Error("The code runner key was rejected. Check the Judge0 key.");
    throw new Error(`Code runner error (${res.status}).`);
  }
  const j = JSON.parse(text);
  return {
    status: j.status?.description ?? "Unknown",
    stdout: unb64(j.stdout),
    stderr: unb64(j.stderr),
    compileOutput: unb64(j.compile_output),
    timeSec: j.time ? Number(j.time) : null,
    memoryKb: j.memory ?? null,
  };
}

/** Loose comparison: ignores whitespace, quote style and boolean/null casing. */
export function sameValue(a: string, b: string) {
  const n = (s: string) =>
    s
      .trim()
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null")
      .replace(/\s+/g, "");
  return n(a) === n(b);
}
