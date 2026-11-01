CREATE TABLE public.quiz_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, topic text NOT NULL, difficulty text NOT NULL, questions jsonb NOT NULL, used boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE ON public.quiz_results FROM authenticated;
REVOKE INSERT, UPDATE ON public.topic_ratings FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.interview_turns FROM authenticated;
GRANT INSERT (user_id, interview_id, question, difficulty) ON public.interview_turns TO authenticated;
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, full_name, college, graduation_year, target_role, skills, resume_path) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, college, graduation_year, target_role, skills, resume_path, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.record_interview_answer(p_user uuid, p_turn uuid, p_answer text, p_evaluation jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE t public.interview_turns; i public.interviews; r public.topic_ratings; s numeric; old numeric; next numeric; n integer; total numeric; result jsonb; d numeric;
BEGIN
 SELECT * INTO t FROM public.interview_turns WHERE id=p_turn AND user_id=p_user;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Question not found'; END IF;
 SELECT * INTO i FROM public.interviews WHERE id=t.interview_id AND user_id=p_user FOR UPDATE;
 SELECT * INTO t FROM public.interview_turns WHERE id=p_turn FOR UPDATE;
 IF i.completed_at IS NOT NULL THEN RAISE EXCEPTION 'This interview has ended'; END IF;
 IF t.score IS NOT NULL THEN RETURN jsonb_build_object('evaluation',t.evaluation,'answer',t.answer,'rating',t.rating_result->'rating','previousRating',t.rating_result->'previousRating','next',NULL); END IF;
 s=(p_evaluation->>'score')::numeric;
 IF s IS NULL OR s<0 OR s>10 THEN RAISE EXCEPTION 'Invalid score'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text || i.topic,0));
 SELECT * INTO r FROM public.topic_ratings WHERE user_id=p_user AND topic=i.topic FOR UPDATE;
 old=coalesce(r.rating,5); n=coalesce(r.attempts,0)+1; total=coalesce(r.total_score,0)+s;
 d=greatest(0,array_position(ARRAY['Easy','Medium','Medium+','Hard','Hard+','Expert'],t.difficulty)-1)*2;
 next=round(least(10,greatest(0,old+1.2*(s/10-1/(1+power(10,(d-old)/4))))),1);
 INSERT INTO public.topic_ratings(user_id,topic,rating,attempts,total_score,confidence,mastery,history) VALUES(p_user,i.topic,next,n,total,least(100,round(100*(1-exp(-n::numeric/6)))),round(total/n*10),(coalesce(r.history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('t',now(),'r',next)))) ON CONFLICT(user_id,topic) DO UPDATE SET rating=excluded.rating,attempts=excluded.attempts,total_score=excluded.total_score,confidence=excluded.confidence,mastery=excluded.mastery,history=excluded.history,updated_at=now();
 result=jsonb_build_object('rating',next,'previousRating',old);
 UPDATE public.interview_turns SET answer=p_answer,score=s,evaluation=p_evaluation,rating_result=result WHERE id=p_turn;
 RETURN result || jsonb_build_object('evaluation',p_evaluation,'answer',p_answer,'next',NULL);
END; $$;
REVOKE ALL ON FUNCTION public.record_interview_answer(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_interview_answer(uuid,uuid,text,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.save_interview_answer(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;

ALTER FUNCTION public.complete_interview(uuid) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.complete_interview(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_interview(uuid) TO authenticated;

DROP POLICY IF EXISTS "read categories" ON public.categories;
CREATE POLICY "read categories" ON public.categories FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.categories FROM anon;
DROP POLICY IF EXISTS "read questions" ON public.questions;
CREATE POLICY "read questions" ON public.questions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.questions FROM anon;