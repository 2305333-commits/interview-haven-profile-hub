CREATE OR REPLACE FUNCTION public.save_coding_result(p_user uuid,p_problem uuid,p_language text,p_code text,p_result jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE p public.coding_problems; r public.topic_ratings; s numeric; old numeric; next numeric; n integer; total numeric; topic_name text;
BEGIN
 SELECT * INTO p FROM public.coding_problems WHERE id=p_problem AND user_id=p_user;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Problem not found'; END IF;
 s=(p_result->>'score')::numeric; IF s IS NULL OR s<0 OR s>10 THEN RAISE EXCEPTION 'Invalid score'; END IF;
 topic_name='Coding: ' || p.topic;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text || topic_name,0));
 SELECT * INTO r FROM public.topic_ratings WHERE user_id=p_user AND topic=topic_name FOR UPDATE;
 old=coalesce(r.rating,5); n=coalesce(r.attempts,0)+1; total=coalesce(r.total_score,0)+s;
 next=round(least(10,greatest(0,old+1.2*(s/10-1/(1+power(10,(4-old)/4))))),1);
 INSERT INTO public.coding_submissions(user_id,problem,language,code,result,score) VALUES(p_user,p.problem,p_language,p_code,p_result,s);
 INSERT INTO public.topic_ratings(user_id,topic,rating,attempts,total_score,confidence,mastery,history) VALUES(p_user,topic_name,next,n,total,least(100,round(100*(1-exp(-n::numeric/6)))),round(total/n*10),coalesce(r.history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('t',now(),'r',next))) ON CONFLICT(user_id,topic) DO UPDATE SET rating=excluded.rating,attempts=excluded.attempts,total_score=excluded.total_score,confidence=excluded.confidence,mastery=excluded.mastery,history=excluded.history,updated_at=now();
END; $$;
REVOKE ALL ON FUNCTION public.save_coding_result(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_coding_result(uuid,uuid,text,text,jsonb) TO service_role;