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
- Voice delivery uses browser-decoded recording timing and the original transcript; keep calculations in `src/lib/voice-delivery.ts` and persist optional metrics inside evaluation JSON so old sessions stay compatible.
- Dashboard practice choices reuse the AppShell navigation entries so names and destinations stay consistent with the main menu.
- All AI calls live in `src/lib/ai.functions.ts` (server fns with `requireSupabaseAuth`) backed by `src/lib/ai.server.ts`; never call the AI gateway from the browser — keeps the key server-side.
- Signed-in pages live under `src/routes/_authenticated/` and render inside `AppShell`; public pages are top-level — one auth gate, no per-page checks.
- Topic ratings use the Elo-like helpers in `src/lib/levels.ts`; change scoring there only so interviews and coding stay consistent.
- User data tables carry `user_id default auth.uid()` with owner-only RLS; the question bank is public read-only.
