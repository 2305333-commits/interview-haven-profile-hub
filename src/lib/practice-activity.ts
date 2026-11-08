import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PracticeEvent } from "@/lib/practice-rewards";

export const quizActivityQuery = queryOptions({
  queryKey: ["quiz_results", "practice-activity"],
  queryFn: async (): Promise<PracticeEvent[]> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) return [];
    const events: PracticeEvent[] = [];
    // Page through history: rewards must not disappear at the API's row limit.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("quiz_results")
        .select("id, topic, created_at")
        .eq("user_id", auth.user.id)
        .gt("total_questions", 0)
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      for (const row of data ?? []) {
        if (row.created_at) events.push({ topic: row.topic, at: row.created_at });
      }
      if (!data || data.length < 500) return events;
    }
  },
});