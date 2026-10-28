import { describe, expect, it, vi } from "vitest";
import { evaluateTogether } from "@/lib/evaluation-workflow";
describe("Evaluation scheduling", () => {
  it("starts answer and media checks before either completes", async () => {
    let release: ((value: number) => void) | undefined;
    const answer = vi.fn(() => new Promise<number>((resolve) => { release = resolve; }));
    const media = vi.fn(async () => "video");
    const result = evaluateTogether(answer, media);
    expect(answer).toHaveBeenCalledOnce();
    expect(media).toHaveBeenCalledOnce();
    release?.(8);
    expect(await result).toEqual([8, "video"]);
  });
  it("propagates a media failure instead of silently dropping video feedback", async () => {
    await expect(evaluateTogether(async () => 8, async () => { throw new Error("Media unavailable"); })).rejects.toThrow("Media unavailable");
  });
});