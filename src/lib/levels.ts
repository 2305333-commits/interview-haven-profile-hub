export const LADDER = ["Easy", "Medium", "Medium+", "Hard", "Hard+", "Expert"] as const;
export type Level = (typeof LADDER)[number];

export function stepLevel(level: string, score: number): Level {
  const i = Math.max(0, LADDER.indexOf(level as Level));
  if (score >= 7) return LADDER[Math.min(LADDER.length - 1, i + 1)];
  if (score <= 4) return LADDER[Math.max(0, i - 1)];
  return LADDER[i];
}

export function levelFromManual(d: "easy" | "medium" | "hard"): Level {
  return d === "easy" ? "Easy" : d === "medium" ? "Medium" : "Hard";
}

/** Elo-like update on a 0–10 scale. Harder questions move the rating more. */
export function updateRating(rating: number, score: number, level: string) {
  const difficulty = (Math.max(0, LADDER.indexOf(level as Level)) / (LADDER.length - 1)) * 10; // 0..10
  const expected = 1 / (1 + Math.pow(10, (difficulty - rating) / 4));
  const actual = score / 10;
  const next = rating + 1.2 * (actual - expected);
  return Math.round(Math.min(10, Math.max(0, next)) * 10) / 10;
}

export const CATEGORIES: { id: string; label: string; description: string; topics: string[] }[] = [
  {
    id: "cs",
    label: "CS Fundamentals",
    description: "OS, DBMS, networks, OOP and more",
    topics: ["Operating Systems", "DBMS", "Computer Networks", "OOP", "Concurrency", "Memory Management"],
  },
  {
    id: "dsa",
    label: "DSA",
    description: "Data structures and algorithms",
    topics: ["Arrays", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Greedy", "Backtracking", "Hashing"],
  },
  {
    id: "behavioral",
    label: "Behavioral / HR",
    description: "Stories, judgement and communication",
    topics: ["Teamwork", "Leadership", "Failure", "Conflict Resolution", "Motivation", "Pressure Handling"],
  },
  {
    id: "project",
    label: "Project Deep Dive",
    description: "Describe a project, get grilled on it",
    topics: ["My Project"],
  },
  {
    id: "teach",
    label: "Teaching Mode",
    description: "Explain a concept you know; AI probes depth",
    topics: ["Custom Concept"],
  },
];
