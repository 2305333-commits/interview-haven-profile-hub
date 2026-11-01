import { z } from "zod";

export const videoEvidenceSchema = z.object({
  audio: z.string().min(1).max(12_000_000),
  frames: z
    .array(
      z
        .string()
        .regex(/^data:image\/jpeg;base64,/)
        .max(600_000),
    )
    .min(1)
    .max(3),
  setting: z.enum(["professional", "smart-casual"]),
  consent: z.literal(true),
});
export type VideoEvidence = z.infer<typeof videoEvidenceSchema>;
const assessment = z.object({ score: z.number().min(0).max(10).nullable(), feedback: z.string() });
const criterion = z.number().min(0).max(10).nullable();
/** Visible-outfit checks only; never body, brand, price, or looks. */
export const outfitSchema = z.object({
  formality: criterion,
  neatness: criterion,
  fit: criterion,
  colors: criterion,
  framing: criterion,
  tips: z.array(z.string()).max(4),
});
export type OutfitBreakdown = z.infer<typeof outfitSchema>;
export const OUTFIT_WEIGHTS = { formality: 0.4, neatness: 0.25, fit: 0.2, colors: 0.15 } as const;
/** Deterministic outfit score so the same observations always give the same number. */
export function outfitScore(o: OutfitBreakdown) {
  const keys = Object.keys(OUTFIT_WEIGHTS) as (keyof typeof OUTFIT_WEIGHTS)[];
  if (keys.some((k) => o[k] === null)) return null;
  return (
    Math.round(
      keys.reduce((sum, k) => sum + Math.max(0, Math.min(10, o[k] ?? 0)) * OUTFIT_WEIGHTS[k], 0) *
        10,
    ) / 10
  );
}
export const videoFeedbackSchema = z.object({
  audio: assessment,
  presentation: assessment,
  outfit: outfitSchema.optional(),
});
export type VideoFeedback = z.infer<typeof videoFeedbackSchema> & {
  overall: number | null;
  setting: VideoEvidence["setting"];
};
export function combineVideoFeedback(
  value: z.infer<typeof videoFeedbackSchema>,
  answerScore: number,
  setting: VideoEvidence["setting"],
): VideoFeedback {
  const normalize = (part: z.infer<typeof assessment>) => ({
    ...part,
    score: part.score === null ? null : Math.max(0, Math.min(10, part.score)),
  });
  const audio = normalize(value.audio);
  const scored = value.outfit ? outfitScore(value.outfit) : undefined;
  const presentation = normalize(
    scored === undefined ? value.presentation : { ...value.presentation, score: scored },
  );
  return {
    audio,
    presentation,
    setting,
    ...(value.outfit ? { outfit: value.outfit } : {}),
    overall:
      audio.score === null || presentation.score === null
        ? null
        : Math.round((answerScore * 0.6 + audio.score * 0.25 + presentation.score * 0.15) * 10) /
          10,
  };
}

/** Complete mono 16kHz WAV, not a partial MediaRecorder chunk. */
export async function recordingAudio(blob: Blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > 125) throw new Error("Please keep each answer under two minutes.");
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const mono = (await offline.startRendering()).getChannelData(0);
    const bytes = new ArrayBuffer(44 + mono.length * 2),
      view = new DataView(bytes);
    const text = (offset: number, value: string) =>
      [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    text(0, "RIFF");
    view.setUint32(4, 36 + mono.length * 2, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, mono.length * 2, true);
    mono.forEach((v, i) =>
      view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * (v < 0 ? 32768 : 32767), true),
    );
    let binary = "";
    const array = new Uint8Array(bytes);
    for (let i = 0; i < array.length; i += 0x8000)
      binary += String.fromCharCode(...array.subarray(i, i + 0x8000));
    return btoa(binary);
  } finally {
    await context.close();
  }
}
