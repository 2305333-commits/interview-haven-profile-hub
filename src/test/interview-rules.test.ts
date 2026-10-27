import { describe, it, expect } from "vitest";
import { questionRules, resumeFacts, spokenEvaluationRules } from "@/lib/interview-rules";
import { combineVideoFeedback, videoEvidenceSchema } from "@/lib/video-interview";
describe("Interview rules", () => {
  it("does not pass saved questions into resume context", () => {
    expect(resumeFacts([{ resume_item: "Payments app", topic: "React", question: "Write a React hook" } as { resume_item: string; topic: string }])).toBe("Payments app (React)");
  });
  it("requires spoken reasoning without code", () => {
    expect(questionRules(true)).toContain("Never request writing, dictating, or providing code");
    expect(questionRules(false)).not.toContain("Never request writing");
    expect(spokenEvaluationRules).toContain("Never penalize missing code");
  });
  it("includes fresh generation and no repeated follow-ups", () => {
    expect(questionRules(true)).toContain("Write a fresh original question, not a saved question");
    expect(questionRules(true)).toContain("including when asking a follow-up");
  });
  it("requires consent before sending video evidence", () => {
    expect(videoEvidenceSchema.safeParse({ audio: "audio", frames: ["data:image/jpeg;base64,eA=="], setting: "professional", consent: false }).success).toBe(false);
  });
  it("does not fabricate an overall score when evidence is unavailable", () => {
    expect(combineVideoFeedback({ audio: { score: null, feedback: "Silent" }, presentation: { score: 8, feedback: "Visible" } }, 9, "professional").overall).toBeNull();
  });
  it("keeps answer scoring separate from presentation scoring", () => {
    const result = combineVideoFeedback({ audio: { score: 8, feedback: "Clear" }, presentation: { score: 6, feedback: "Casual" } }, 10, "professional");
    expect(result.overall).toBe(8.9);
  });
});