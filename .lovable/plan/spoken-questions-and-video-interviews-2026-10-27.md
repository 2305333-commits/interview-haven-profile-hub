# Spoken questions and video interviews

## Fix the current interviews
- Voice questions must be answerable naturally out loud: explain an approach, algorithm, trade-off, or complexity, without writing or dictating code.
- Apply that rule to first questions, follow-ups, scoring, and improved/ideal answers. Do not penalize a spoken answer for lacking code.
- Keep actual code-writing tasks in Coding Practice.
- Continue generating questions fresh for each request. For resume interviews, use the saved resume topics as background, not saved question wording. Avoid repeating questions within a session; independent sessions cannot guarantee globally unique wording.

## Add Video Interview
- Add a separate Video Interview choice to the existing menu and dashboard practice chooser, preserving all current features.
- Show a live camera preview with explicit permission and consent before sending recordings for AI analysis.
- Record each answer with camera and microphone, with clear record/stop, playback, retry, and submit controls. Show processing and permission errors without losing the answer.
- Return one feedback report covering answer quality, audible delivery, and interview presentation, with separate scores and an overall practice score.
- Assess clothing only for visible suitability for the selected interview setting—not price, brands, attractiveness, body type, or protected characteristics. Keep attire feedback separate from technical mastery and topic ratings.
- Assess audible delivery such as pace, volume consistency, articulation, and vocal variation. Do not infer personality, honesty, emotional state, or employability from voice or appearance.
- If audio or visual evidence is unclear, mark that assessment unavailable rather than inventing a score.
- Keep raw recordings temporary, clear them when leaving or restarting, and save feedback with session history. Explain that submitting sends the recording for AI processing.

## Technical approach
- Preserve the current TanStack Start architecture, shared interview experience, authenticated AI functions, and existing text models.
- Centralize spoken-question and evaluation rules in a small testable helper shared by generation and scoring.
- Use a verified audio-capable multimodal model for the new recording assessment; the existing text evaluator does not hear audio. Evaluate sampled video frames for presentation and the complete audio for delivery.
- Store optional video feedback in evaluation JSON so old sessions remain compatible; do not add a separate recording archive.

## Verification
- Add focused tests for spoken question/evaluation rules and fresh resume context handling.
- Verify a real media request against the AI service, including unavailable-evidence handling.
- Verify camera preview, recording, retry, submit, and saved feedback through the signed-in app on desktop and mobile layouts. If no authorized account is available, report that verification limitation explicitly.