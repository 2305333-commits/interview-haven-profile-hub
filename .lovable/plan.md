# InterviewVerse — Milestone 1

Your upload is a Vite + React Router app (not Next.js) with two half-built apps: an AI quiz (Home/Quiz/Results/History) and an interview library (Dashboard/Library/Practice/Sessions/SessionDetail). Both get merged and moved onto this project's setup, keeping every existing feature.

## What you'll get
- **Accounts**: email/password sign-up and login, Google sign-in, forgot/reset password, secure sessions.
- **Profile**: name, college, graduation year, target role, skills, resume PDF upload, completion %, edit page.
- **Dashboard** after login: interview history, per-topic levels, strengths/weak areas.
- **Kept from your upload**: question library by category, practice sessions with self-rating, session detail, AI quiz with results and history (now saved per user).
- **Adaptive AI interviews**: pick category/topic (CS Fundamentals, DSA, Behavioral, Project Deep Dive, Teaching Mode), adaptive or manual difficulty, follow-ups on/off. Each answer scored out of 10 with feedback, improved answer, ideal answer, missing concepts. Topic rating moves up/down (Elo-like) with difficulty ladder Easy → Expert.
- **Coding**: code editor, write a full program or just the function, AI judges against hidden tests (pass/fail, complexity, edge cases, improvements). Real code execution is replaced by AI judging, since the server can't run arbitrary code.
- **Voice mode**: AI speaks questions, you answer by microphone, speech is transcribed and scored, including communication.

Later milestones: skill-map charts, XP/badges/streaks, resume-based questions, study plans, reports, admin panel.

## Technical details
- Port pages from `src/pages` and `src/views` to TanStack routes; replace `react-router-dom` and `App.tsx` view-switching with file routes (`/`, `/auth`, `/reset-password`, `/_authenticated/{dashboard,profile,library,practice,sessions,sessions/$id,quiz,interview,coding,voice}`).
- Enable Lovable Cloud; port the 3 migrations (categories, questions, sessions, answers, quiz_results + seed bank), add `user_id` + owner-only RLS, plus `profiles`, `topic_ratings`, `interview_turns`, and a private `resumes` storage bucket.
- Replace the `generate-quiz` edge function with server functions calling the Lovable AI Gateway (structured JSON output) for quiz generation, question generation, evaluation, and code judging.
- Voice: browser speech playback for questions + gateway speech-to-text for answers.
- Tailwind v3 config → Tailwind v4 tokens in `src/styles.css`; keep existing UI components (`ui.tsx`, `Layout.tsx`).
