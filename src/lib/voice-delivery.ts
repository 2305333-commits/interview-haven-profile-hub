import { z } from "zod";

export const audioTimingSchema = z.object({
  durationSeconds: z.number().finite().positive().max(7200),
  speechSeconds: z.number().finite().min(0).max(7200),
  pauseSeconds: z.number().finite().min(0).max(7200),
  pauseCount: z.number().int().min(0).max(14400),
  longestPauseSeconds: z.number().finite().min(0).max(7200),
}).refine((t) => t.speechSeconds <= t.durationSeconds && t.pauseSeconds <= t.durationSeconds && t.longestPauseSeconds <= t.pauseSeconds);

export const voiceRecordingSchema = z.object({
  timing: audioTimingSchema,
  transcript: z.string().min(1).max(12000),
});
export type AudioTiming = z.infer<typeof audioTimingSchema>;
export type VoiceRecording = z.infer<typeof voiceRecordingSchema>;
export type VoiceDelivery = AudioTiming & {
  wordCount: number;
  wordsPerMinute: number;
  fillerCount: number;
  fillersPer100Words: number;
};

/** Energy-based estimates, not semantic voice activity or emotion detection. */
export function measureAudio(samples: Float32Array, sampleRate: number): AudioTiming | null {
  if (!samples.length || sampleRate <= 0) return null;
  const frameSize = Math.max(1, Math.round(sampleRate * 0.02));
  let speechSeconds = 0;
  let silence = 0;
  let heardSpeech = false;
  let pauseSeconds = 0;
  let pauseCount = 0;
  let longestPauseSeconds = 0;
  for (let start = 0; start < samples.length; start += frameSize) {
    const end = Math.min(samples.length, start + frameSize);
    let energy = 0;
    for (let i = start; i < end; i++) energy += (samples[i] ?? 0) ** 2;
    const seconds = (end - start) / sampleRate;
    if (Math.sqrt(energy / (end - start)) >= 0.015) {
      if (heardSpeech && silence >= 0.5 - 1e-9) {
        pauseCount++;
        pauseSeconds += silence;
        longestPauseSeconds = Math.max(longestPauseSeconds, silence);
      }
      speechSeconds += seconds;
      heardSpeech = true;
      silence = 0;
    } else if (heardSpeech) silence += seconds;
  }
  if (!heardSpeech) return null;
  const durationSeconds = samples.length / sampleRate;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { durationSeconds, speechSeconds: Math.min(durationSeconds, round(speechSeconds)), pauseSeconds: Math.min(durationSeconds, round(pauseSeconds)), pauseCount, longestPauseSeconds: round(longestPauseSeconds) };
}

export function summarizeDelivery(recordings: VoiceRecording[]): VoiceDelivery | null {
  if (!recordings.length) return null;
  const timing = recordings.reduce<AudioTiming>((total, r) => ({
    durationSeconds: total.durationSeconds + r.timing.durationSeconds,
    speechSeconds: total.speechSeconds + r.timing.speechSeconds,
    pauseSeconds: total.pauseSeconds + r.timing.pauseSeconds,
    pauseCount: total.pauseCount + r.timing.pauseCount,
    longestPauseSeconds: Math.max(total.longestPauseSeconds, r.timing.longestPauseSeconds),
  }), { durationSeconds: 0, speechSeconds: 0, pauseSeconds: 0, pauseCount: 0, longestPauseSeconds: 0 });
  const transcript = recordings.map((r) => r.transcript).join(" ");
  const wordCount = (transcript.match(/\b[\p{L}\p{N}]+(?:['’][\p{L}]+)?\b/gu) ?? []).length;
  // Ambiguous words such as “like” are not counted as fillers automatically.
  const fillerCount = (transcript.match(/\b(?:um+|uh+|erm+|hmm+|you know|i mean)\b/gi) ?? []).length;
  if (!timing.durationSeconds || !wordCount) return null;
  return { ...timing, wordCount, wordsPerMinute: Math.round(wordCount * 60 / timing.durationSeconds), fillerCount, fillersPer100Words: Math.round(fillerCount * 1000 / wordCount) / 10 };
}

export function deliveryPrompt(delivery: VoiceDelivery | null): string {
  if (!delivery) return "No audio delivery measurements are available. Judge wording only; do not claim to have assessed vocal tone, pace, pauses, pitch, or emotion.";
  return `Recorded delivery estimates (from original recording, even if the candidate edited the submitted text): ${JSON.stringify(delivery)}.
Use measured pace, internal pauses of at least 0.5 seconds, and transcript filler frequency as supporting evidence for clarity and confidence, alongside the answer's wording. Mention concrete measurements and one helpful delivery suggestion in feedback. Overall pace includes recording silence; pauses exclude leading/trailing silence and gaps between recordings. Energy-based silence can be affected by microphone/noise. Filler detection is approximate and transcription may omit fillers. Never infer pitch, emotional state, accent quality or vocal tone from these metrics; don't penalize accent or thoughtful pauses automatically. Grade technical correctness on the submitted text.`;
}

/** Browser-only call site: decoding is performed after recording, not during render. */
export async function analyzeRecording(blob: Blob): Promise<AudioTiming | null> {
  const audio = new AudioContext();
  try {
    const buffer = await audio.decodeAudioData(await blob.arrayBuffer());
    const samples = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] ?? 0) + (data[i] ?? 0) / buffer.numberOfChannels;
    }
    return measureAudio(samples, buffer.sampleRate);
  } finally {
    await audio.close();
  }
}