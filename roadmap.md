# Voice delivery checks
- [x] Speed up evaluations with a faster evaluator, parallel video checks, and feedback before next-question generation; signed-in checks measured 10.5s text and 9.1s video feedback, with saved feedback read-back and 15 tests passing. Timings vary; no guaranteed 2–3-second evaluation.
- [x] Measure recorded pace, pauses, and transcript filler words.
- [x] Include delivery signals in voice scoring and persist measurements in feedback.
- [x] Test calculations and verify a live AI evaluation with delivery measurements.
- [x] Verify signed-in voice recording, evaluation, and saved delivery feedback with a spoken test feed.

# Spoken and video interviews
- [x] Make voice questions and evaluation suitable for spoken explanations, never requiring code.
- [x] Generate fresh resume-based interview questions instead of reusing saved prompts.
- [x] Add a separate Video Interview with consent-based camera/microphone recording and combined feedback.
- [x] Test question rules and verify recording, playback, retry, evaluation, mobile layouts, and saved feedback with spoken audio and a camera test pattern; verified unavailable visual evidence is not scored.