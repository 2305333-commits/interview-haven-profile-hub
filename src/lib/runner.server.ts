// Runs code for real on Wandbox (free public compiler service, no key). Server-only.
const COMPILER = {
  python: "cpython-3.12.7",
  javascript: "nodejs-20.17.0",
  java: "openjdk-jdk-21+35",
  cpp: "gcc-13.2.0",
} as const;

export type RunOutput = {
  status: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeSec: number | null;
  memoryKb: number | null;
};

export async function runCode(language: keyof typeof COMPILER, source: string): Promise<RunOutput> {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compiler: COMPILER[language],
      // Wandbox saves Java as prog.java, so a top-level public class won't compile.
      code:
        language === "java"
          ? source.replace(/^(\s*)public\s+((?:final\s+)?class\s)/gm, "$1$2")
          : source,
      ...(language === "cpp" ? { options: "c++17", "compiler-option-raw": "-O2" } : {}),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("Wandbox failed", res.status, text);
    throw new Error(`The code runner is busy (${res.status}). Please try again.`);
  }
  const j = JSON.parse(text);
  const exit = String(j.status ?? "");
  const compileOutput = String(j.compiler_error ?? "");
  const status = j.signal
    ? `Killed (${j.signal})`
    : compileOutput && exit !== "0"
      ? "Compilation Error"
      : exit === "0"
        ? "Accepted"
        : `Runtime Error (exit ${exit})`;
  return {
    status,
    stdout: String(j.program_output ?? ""),
    stderr: String(j.program_error ?? ""),
    compileOutput: status === "Compilation Error" ? compileOutput : "",
    timeSec: null,
    memoryKb: null,
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
