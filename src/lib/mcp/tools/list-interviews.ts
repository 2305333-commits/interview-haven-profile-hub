import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_interviews",
  title: "List interviews",
  description: "List the signed-in user's recent InterviewVerse interview sessions with topic, mode and average score.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many recent interviews to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("interviews")
      .select("id, topic, category, mode, difficulty, avg_score, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) throw new ToolError(error.message);
    const interviews = (data ?? []).map((i) => ({
      id: String(i.id),
      topic: String(i.topic),
      category: String(i.category),
      mode: String(i.mode),
      difficulty: String(i.difficulty),
      avg_score: i.avg_score == null ? null : Number(i.avg_score),
      created_at: String(i.created_at),
      completed: i.completed_at != null,
    }));
    const text = interviews.length
      ? interviews.map((i) => `${i.created_at.slice(0, 10)} ${i.mode} · ${i.topic} (${i.difficulty}) — ${i.avg_score ?? "no score"}`).join("\n")
      : "No interviews yet.";
    return { content: [{ type: "text", text }], structuredContent: { interviews } };
  },
});
