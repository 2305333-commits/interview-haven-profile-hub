CREATE TABLE public.resume_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question text NOT NULL,
  topic text NOT NULL,
  resume_item text NOT NULL,
  kind text NOT NULL DEFAULT 'technical',
  difficulty text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_questions TO authenticated;
GRANT ALL ON public.resume_questions TO service_role;
ALTER TABLE public.resume_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own resume questions" ON public.resume_questions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX resume_questions_user_idx ON public.resume_questions(user_id, created_at DESC);