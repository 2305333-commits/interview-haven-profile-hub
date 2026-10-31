CREATE TABLE public.coding_problems (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, topic text NOT NULL, problem jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.coding_problems TO service_role;
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_turns ADD COLUMN rating_result jsonb;
CREATE OR REPLACE FUNCTION public.save_interview_answer(p_turn uuid, p_answer text, p_evaluation jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE t public.interview_turns; i public.interviews; r public.topic_ratings; s numeric; old numeric; next numeric; n integer; total numeric; result jsonb; d numeric;
BEGIN
 SELECT * INTO t FROM public.interview_turns WHERE id=p_turn AND user_id=auth.uid();
 IF t.id IS NULL THEN RAISE EXCEPTION 'Question not found'; END IF;
 SELECT * INTO i FROM public.interviews WHERE id=t.interview_id AND user_id=auth.uid() FOR UPDATE;
 SELECT * INTO t FROM public.interview_turns WHERE id=p_turn FOR UPDATE;
 IF i.completed_at IS NOT NULL THEN RAISE EXCEPTION 'This interview has ended'; END IF;
 IF t.score IS NOT NULL THEN RETURN jsonb_build_object('evaluation',t.evaluation,'answer',t.answer,'rating',t.rating_result->'rating','previousRating',t.rating_result->'previousRating','next',NULL); END IF;
 s=(p_evaluation->>'score')::numeric;
 IF s IS NULL OR s<0 OR s>10 THEN RAISE EXCEPTION 'Invalid score'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || i.topic,0));
 SELECT * INTO r FROM public.topic_ratings WHERE user_id=auth.uid() AND topic=i.topic FOR UPDATE;
 old=coalesce(r.rating,5); n=coalesce(r.attempts,0)+1; total=coalesce(r.total_score,0)+s;
 d=greatest(0,array_position(ARRAY['Easy','Medium','Medium+','Hard','Hard+','Expert'],t.difficulty)-1)*2;
 next=round(least(10,greatest(0,old+1.2*(s/10-1/(1+power(10,(d-old)/4))))),1);
 INSERT INTO public.topic_ratings(user_id,topic,rating,attempts,total_score,confidence,mastery,history) VALUES(auth.uid(),i.topic,next,n,total,least(100,round(100*(1-exp(-n::numeric/6)))),round(total/n*10),(coalesce(r.history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('t',now(),'r',next)))) ON CONFLICT(user_id,topic) DO UPDATE SET rating=excluded.rating,attempts=excluded.attempts,total_score=excluded.total_score,confidence=excluded.confidence,mastery=excluded.mastery,history=excluded.history,updated_at=now();
 result=jsonb_build_object('rating',next,'previousRating',old);
 UPDATE public.interview_turns SET answer=p_answer,score=s,evaluation=p_evaluation,rating_result=result WHERE id=p_turn;
 RETURN result || jsonb_build_object('evaluation',p_evaluation,'answer',p_answer,'next',NULL);
END; $$;
REVOKE ALL ON FUNCTION public.save_interview_answer(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_interview_answer(uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.complete_interview(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE i public.interviews; a numeric; n integer; gained integer;
BEGIN
 SELECT * INTO i FROM public.interviews WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
 IF i.id IS NULL THEN RAISE EXCEPTION 'Interview not found'; END IF;
 SELECT avg(score),count(score) INTO a,n FROM public.interview_turns WHERE interview_id=p_id AND user_id=auth.uid();
 IF i.completed_at IS NOT NULL THEN RETURN jsonb_build_object('avg',i.avg_score,'answered',n,'xpGained',0); END IF;
 DELETE FROM public.interview_turns WHERE interview_id=p_id AND user_id=auth.uid() AND score IS NULL;
 gained=round(n*10+coalesce(a,0)*5);
 UPDATE public.interviews SET completed_at=now(),avg_score=round(a,1) WHERE id=p_id;
 UPDATE public.profiles SET xp=xp+gained WHERE id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
 RETURN jsonb_build_object('avg',round(a,1),'answered',n,'xpGained',gained);
END; $$;
REVOKE ALL ON FUNCTION public.complete_interview(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_interview(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.append_interview_question(p_id uuid,p_question text,p_difficulty text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE i public.interviews; t public.interview_turns;
BEGIN
 SELECT * INTO i FROM public.interviews WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
 IF i.id IS NULL OR i.completed_at IS NOT NULL THEN RAISE EXCEPTION 'This interview has ended'; END IF;
 SELECT * INTO t FROM public.interview_turns WHERE interview_id=p_id AND user_id=auth.uid() AND score IS NULL ORDER BY created_at LIMIT 1;
 IF t.id IS NULL THEN INSERT INTO public.interview_turns(user_id,interview_id,question,difficulty) VALUES(auth.uid(),p_id,p_question,p_difficulty) RETURNING * INTO t; END IF;
 RETURN jsonb_build_object('id',t.id,'question',t.question,'difficulty',t.difficulty);
END; $$;
REVOKE ALL ON FUNCTION public.append_interview_question(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.append_interview_question(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.replace_resume_questions(p_path text,p_rows jsonb) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE current_path text; n integer;
BEGIN
 SELECT resume_path INTO current_path FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF current_path IS DISTINCT FROM p_path THEN RAISE EXCEPTION 'Resume changed; please rebuild questions'; END IF;
 n=jsonb_array_length(p_rows); IF n<1 OR n>30 THEN RAISE EXCEPTION 'No resume questions generated'; END IF;
 DELETE FROM public.resume_questions WHERE user_id=auth.uid();
 INSERT INTO public.resume_questions(user_id,question,topic,resume_item,kind,difficulty) SELECT auth.uid(),x.question,x.topic,x.resume_item,x.kind,x.difficulty FROM jsonb_to_recordset(p_rows) AS x(question text,topic text,resume_item text,kind text,difficulty text);
 RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.replace_resume_questions(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_resume_questions(text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.clear_stale_resume_context() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.resume_path IS DISTINCT FROM OLD.resume_path THEN DELETE FROM public.resume_questions WHERE user_id=NEW.id; END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.clear_stale_resume_context() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clear_stale_resume_context AFTER UPDATE OF resume_path ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.clear_stale_resume_context();