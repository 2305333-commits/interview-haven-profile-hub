import { describe, expect, it } from "vitest";
import { audioTimingSchema, deliveryPrompt, measureAudio, summarizeDelivery } from "@/lib/voice-delivery";

describe("Voice delivery", () => {
  it("counts internal pauses and their duration, excluding edge silence", () => {
    const samples = new Float32Array(5000);
    samples.fill(0.1, 1000, 2000);
    samples.fill(0.1, 3000, 4000);
    const timing = measureAudio(samples, 1000);
    expect(timing?.durationSeconds).toBe(5);
    expect(timing?.speechSeconds).toBeCloseTo(2);
    expect(timing?.pauseCount).toBe(1);
    expect(timing?.pauseSeconds).toBeCloseTo(1);
    expect(timing?.longestPauseSeconds).toBeCloseTo(1);
  });
  it("ignores short gaps and returns no measurements for silence", () => {
    const samples = new Float32Array(1000).fill(0.1);
    samples.fill(0, 200, 400);
    expect(measureAudio(samples, 1000)?.pauseCount).toBe(0);
    expect(measureAudio(new Float32Array(1000), 1000)).toBeNull();
  });
  it("calculates pace and filler density from the recorded transcript", () => {
    const timing = { durationSeconds: 60, speechSeconds: 40, pauseSeconds: 2, pauseCount: 1, longestPauseSeconds: 2 };
    const result = summarizeDelivery([{ timing, transcript: "Um I mean I like databases you know uh" }]);
    expect(result?.wordCount).toBe(10);
    expect(result?.wordsPerMinute).toBe(10);
    expect(result?.fillerCount).toBe(4);
    expect(result?.fillersPer100Words).toBe(40);
  });
  it("combines recordings without counting time between takes", () => {
    const recording = { timing: { durationSeconds: 10, speechSeconds: 8, pauseSeconds: 1, pauseCount: 1, longestPauseSeconds: 1 }, transcript: "I explain this concept" };
    expect(summarizeDelivery([recording, recording])).toMatchObject({ durationSeconds: 20, wordCount: 8, wordsPerMinute: 24, pauseCount: 2 });
    expect(summarizeDelivery([])).toBeNull();
  });
  it("rejects impossible measurements", () => {
    expect(audioTimingSchema.safeParse({ durationSeconds: 2, speechSeconds: 3, pauseSeconds: 0, pauseCount: 0, longestPauseSeconds: 0 }).success).toBe(false);
  });
  it("gives measured delivery evidence to the evaluator", () => {
    const metrics = summarizeDelivery([{ timing: { durationSeconds: 60, speechSeconds: 40, pauseSeconds: 2, pauseCount: 1, longestPauseSeconds: 2 }, transcript: "um database transactions" }]);
    expect(JSON.parse(deliveryPrompt(metrics).split(": ")[1]?.split(".\n")[0] ?? "{}")).toMatchObject({ wordsPerMinute: 3, fillerCount: 1, pauseCount: 1 });
  });
});