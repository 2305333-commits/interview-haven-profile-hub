REVOKE INSERT, UPDATE ON public.interviews FROM authenticated;
GRANT INSERT (user_id, mode, category, topic, difficulty, adaptive, follow_ups, context) ON public.interviews TO authenticated;
REVOKE INSERT, UPDATE ON public.coding_submissions FROM authenticated;
DROP POLICY IF EXISTS "read categories" ON public.categories;
DROP POLICY IF EXISTS "read questions" ON public.questions;
REVOKE ALL ON public.categories FROM anon, authenticated;
REVOKE ALL ON public.questions FROM anon, authenticated;
COMMENT ON TABLE public.categories IS 'DEPRECATED: fixed question library retired; server-only';
COMMENT ON TABLE public.questions IS 'DEPRECATED: fixed question library retired; server-only';