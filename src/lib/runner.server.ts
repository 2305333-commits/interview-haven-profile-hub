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

export function judgeStatus(status: string, passed: number, total: number) {
  return status === "Accepted" && passed < total ? "Wrong Answer" : status;
}

export async function runCode(language: keyof typeof COMPILER, source: string): Promise<RunOutput> {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45000),
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

/** Compare canonical JSON without altering string contents. */
export function sameValue(a: string, b: string) {
  const equal = (x: unknown, y: unknown): boolean => {
    if (x === y) return true;
    if (Array.isArray(x) && Array.isArray(y)) return x.length === y.length && x.every((v, i) => equal(v, y[i]));
    if (x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && !Array.isArray(y)) {
      const left = x as Record<string, unknown>, right = y as Record<string, unknown>;
      return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every((k) => Object.hasOwn(right, k) && equal(left[k], right[k]));
    }
    return false;
  };
  try { return equal(JSON.parse(a), JSON.parse(b)); } catch { return false; }
}
