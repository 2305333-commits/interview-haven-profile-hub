CREATE OR REPLACE FUNCTION public.append_interview_question(p_id uuid, p_question text, p_difficulty text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE i public.interviews; t public.interview_turns; uid uuid := auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 IF p_question IS NULL OR length(p_question) < 1 OR length(p_question) > 2000 THEN RAISE EXCEPTION 'Invalid question'; END IF;
 IF p_difficulty IS NULL OR length(p_difficulty) > 20 THEN RAISE EXCEPTION 'Invalid difficulty'; END IF;
 SELECT * INTO i FROM public.interviews WHERE id=p_id AND user_id=uid FOR UPDATE;
 IF i.id IS NULL OR i.completed_at IS NOT NULL THEN RAISE EXCEPTION 'This interview has ended'; END IF;
 SELECT * INTO t FROM public.interview_turns WHERE interview_id=p_id AND user_id=uid AND score IS NULL ORDER BY created_at LIMIT 1;
 IF t.id IS NULL THEN INSERT INTO public.interview_turns(user_id,interview_id,question,difficulty) VALUES(uid,p_id,p_question,p_difficulty) RETURNING * INTO t; END IF;
 RETURN jsonb_build_object('id',t.id,'question',t.question,'difficulty',t.difficulty);
END; $function$;
REVOKE ALL ON FUNCTION public.append_interview_question(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_interview_question(uuid,text,text) TO authenticated;