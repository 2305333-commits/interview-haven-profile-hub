<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## InterviewVerse architecture
- Interview evaluation uses the latency-focused evaluator in ai.server.ts; question generation keeps its existing model, and video evidence assessment runs concurrently with answer grading.
- submitAnswer saves and returns feedback before nextInterviewQuestion runs; the client displays saved feedback during the separate adaptive follow-up request and allows retry without regrading.
- Spoken interview constraints live in interview-rules.ts and apply to generation and evaluation; resume context uses facts only to avoid replaying saved prompts.
- VideoAnswer owns temporary camera recordings and extracts complete WAV audio plus sampled frames; authenticated submitAnswer persists only optional feedback JSON and keeps presentation separate from topic ratings.
- Video audio/frame assessment uses the verified audio-capable Gemini model in video-assessment.server.ts because the existing text evaluator cannot hear recordings.
- Saved AI interview reviews use /interviews/$id and shared EvaluationCard so optional media feedback reads back consistently from History.
- Voice delivery uses browser-decoded recording timing and the original transcript; keep calculations in `src/lib/voice-delivery.ts` and persist optional metrics inside evaluation JSON so old sessions stay compatible.
- Dashboard practice choices reuse the AppShell navigation entries so names and destinations stay consistent with the main menu.
- All AI calls live in `src/lib/ai.functions.ts` (server fns with `requireSupabaseAuth`) backed by `src/lib/ai.server.ts`; never call the AI gateway from the browser — keeps the key server-side.
- Signed-in pages live under `src/routes/_authenticated/` and render inside `AppShell`; public pages are top-level — one auth gate, no per-page checks.
- Topic ratings use the Elo-like helpers in `src/lib/levels.ts`; change scoring there only so interviews and coding stay consistent.
- User data tables carry `user_id default auth.uid()` with owner-only RLS; the question bank is public read-only.
- External agent access (MCP) lives in `src/lib/mcp/` with one tool per file, OAuth-verified and queried through `supabaseForUser` so owner-only RLS still applies; consent page is `src/routes/[.]lovable.oauth.consent.tsx` and `/auth` honors a validated `next` return path.

- Interview answer, completion, next-turn and resume replacement writes use owner-scoped transactional RPCs to make concurrent retries safe; coding problems and tests are server-only and privileged access always checks the authenticated owner.
- Rating math remains defined in levels.ts; transactional SQL mirrors the same Elo formula so increments cannot be lost under concurrent submissions. Keep their regression checks aligned.
