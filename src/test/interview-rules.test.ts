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
import { outfitScore as _outfitScore, combineVideoFeedback as _combine } from "@/lib/video-interview";
describe("outfit scoring", () => {
  it("weights formality 40, neatness 25, fit 20, colors 15", () => {
    expect(_outfitScore({ formality: 10, neatness: 8, fit: 6, colors: 4, framing: 2, tips: [] })).toBe(7.8);
  });
  it("is unscored when any outfit criterion is not visible", () => {
    expect(_outfitScore({ formality: 9, neatness: null, fit: 8, colors: 8, framing: 9, tips: [] })).toBeNull();
  });
  it("uses the outfit score as the presentation score", () => {
    const r = _combine({ audio: { score: 8, feedback: "" }, presentation: { score: 2, feedback: "" }, outfit: { formality: 10, neatness: 10, fit: 10, colors: 10, framing: 0, tips: [] } }, 10, "professional");
    expect(r.presentation.score).toBe(10);
  });
});
