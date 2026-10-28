import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_skill_ratings",
  title: "List skill ratings",
  description: "List the signed-in user's InterviewVerse topic ratings, mastery and attempt counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("topic_ratings")
      .select("topic, rating, mastery, confidence, attempts, updated_at")
      .order("rating", { ascending: false })
      .limit(100);
    if (error) throw new ToolError(error.message);
    const ratings = (data ?? []).map((r) => ({
      topic: String(r.topic),
      rating: Number(r.rating),
      mastery: Number(r.mastery),
      confidence: Number(r.confidence),
      attempts: Number(r.attempts),
      updated_at: String(r.updated_at),
    }));
    const text = ratings.length
      ? ratings.map((r) => `${r.topic}: rating ${Math.round(r.rating)}, mastery ${Math.round(r.mastery)}%, ${r.attempts} attempts`).join("\n")
      : "No skill ratings yet.";
    return { content: [{ type: "text", text }], structuredContent: { ratings } };
  },
});
