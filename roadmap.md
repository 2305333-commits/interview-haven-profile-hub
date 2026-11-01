# Voice delivery checks
# Pre-publication audit
- [x] Fix account-cache isolation, concurrent score saving, coding test integrity, and recording lifecycle issues; concurrent regression checks passed.
- [x] Verify signed-in text/written interviews, quiz saving, concept grading, discussion, profile saving, history, voice/video recording and evaluation using synthetic speech/camera input, and agent access rejection/error states.
- [x] Check dependencies, security, automated tests (27 passed), and current preview errors (build OK); no known production dependency vulnerabilities.
- [ ] Verify email confirmation/reset delivery and Google sign-in with real account interaction; blocker: provider/account interaction and email inbox access unavailable to automated checks.
- [ ] Verify real clothing evidence and complete external MCP OAuth approve/deny flow; blocker: real recording and external client authorization interaction not available.
- [ ] Verify the published URL and hosted sign-in return addresses; blocker: app not published yet. No publication requested during this audit.

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