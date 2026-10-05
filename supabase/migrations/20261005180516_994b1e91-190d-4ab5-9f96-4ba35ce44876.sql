CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  college text,
  graduation_year int,
  target_role text,
  skills text[] NOT NULL DEFAULT '{}',
  resume_path text,
  xp int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  text text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  tips text,
  estimated_minutes int NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read questions" ON public.questions FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_questions_category ON public.questions(category_id);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  body text NOT NULL,
  self_rating int CHECK (self_rating BETWEEN 1 AND 5),
  notes text,
  time_spent_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answers" ON public.answers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  score int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  time_spent_seconds int NOT NULL DEFAULT 0,
  question_count int NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quiz results" ON public.quiz_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.topic_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic text NOT NULL,
  rating numeric NOT NULL DEFAULT 5,
  confidence numeric NOT NULL DEFAULT 0,
  mastery numeric NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 0,
  history jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic)
);
GRANT SELECT, INSERT, UPDATE ON public.topic_ratings TO authenticated;
GRANT ALL ON public.topic_ratings TO service_role;
ALTER TABLE public.topic_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ratings" ON public.topic_ratings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  mode text NOT NULL DEFAULT 'text',
  category text NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  adaptive boolean NOT NULL DEFAULT true,
  follow_ups boolean NOT NULL DEFAULT true,
  context text,
  avg_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interviews" ON public.interviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.interview_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question text NOT NULL,
  difficulty text NOT NULL,
  answer text,
  score numeric,
  evaluation jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_turns TO authenticated;
GRANT ALL ON public.interview_turns TO service_role;
ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own turns" ON public.interview_turns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.coding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  problem jsonb NOT NULL,
  language text NOT NULL,
  code text NOT NULL,
  result jsonb,
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.coding_submissions TO authenticated;
GRANT ALL ON public.coding_submissions TO service_role;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own submissions" ON public.coding_submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own resume read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own resume write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own resume update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own resume delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO public.categories (name, slug, description, icon, color, sort_order) VALUES
('Behavioral', 'behavioral', 'Questions about how you handle real-world workplace situations.', 'Users', 'primary', 1),
('Technical (Software Engineering)', 'technical', 'Core software engineering concepts and practices.', 'Code2', 'accent', 2),
('System Design', 'system-design', 'Designing scalable, reliable systems end-to-end.', 'Network', 'success', 3),
('Leadership & Management', 'leadership', 'Questions for lead, manager, and director roles.', 'Crown', 'warning', 4),
('Product Management', 'product', 'Strategy, prioritization, and product thinking.', 'Target', 'error', 5),
('Data Structures & Algorithms', 'dsa', 'Classic algorithmic and data structure problems.', 'Binary', 'primary', 6),
('Career & Motivation', 'career', 'Questions about goals, motivation, and fit.', 'Compass', 'accent', 7),
('CS Fundamentals', 'cs-fundamentals', 'Operating systems, DBMS, networks, OOP and concurrency.', 'Cpu', 'accent', 8);

INSERT INTO public.questions (category_id, text, difficulty, tips, estimated_minutes) VALUES
((SELECT id FROM public.categories WHERE slug='behavioral'), 'Tell me about yourself.', 'easy', 'Structure as: present role → key past experience → why you are here. Keep it to 90 seconds.', 3),
((SELECT id FROM public.categories WHERE slug='behavioral'), 'Describe a time you faced a conflict at work and how you resolved it.', 'medium', 'Use STAR: Situation, Task, Action, Result. Focus on your role, not blaming others.', 5),
((SELECT id FROM public.categories WHERE slug='behavioral'), 'Tell me about a time you failed and what you learned.', 'medium', 'Pick a genuine failure with a real lesson. Show accountability and growth.', 5),
((SELECT id FROM public.categories WHERE slug='behavioral'), 'How do you handle tight deadlines and pressure?', 'easy', 'Give a concrete example. Mention prioritization, communication, and staying calm.', 4),
((SELECT id FROM public.categories WHERE slug='technical'), 'Explain the difference between SQL and NoSQL databases.', 'easy', 'Cover structure, schema, scaling, ACID vs BASE, and when to use each.', 5),
((SELECT id FROM public.categories WHERE slug='technical'), 'How does HTTPS work? Walk through the TLS handshake.', 'hard', 'Cover asymmetric key exchange, certificate verification, and symmetric session keys.', 7),
((SELECT id FROM public.categories WHERE slug='technical'), 'What is idempotency and why does it matter in APIs?', 'medium', 'Same result no matter how many times called. Critical for payments and retries.', 4),
((SELECT id FROM public.categories WHERE slug='system-design'), 'Design a URL shortener like bit.ly.', 'medium', 'Cover encoding, storage, redirects, analytics, and scaling.', 10),
((SELECT id FROM public.categories WHERE slug='system-design'), 'Design a chat application like WhatsApp.', 'hard', 'Real-time messaging, presence, delivery guarantees, push notifications, scaling.', 12),
((SELECT id FROM public.categories WHERE slug='leadership'), 'How do you build trust within a team?', 'easy', 'Transparency, consistency, and following through on commitments.', 4),
((SELECT id FROM public.categories WHERE slug='leadership'), 'Describe how you handle an underperforming team member.', 'medium', 'Root cause, clear expectations, support plan, follow-ups.', 6),
((SELECT id FROM public.categories WHERE slug='product'), 'How do you decide what to build next?', 'medium', 'Impact/effort, strategic alignment, customer feedback, and data.', 5),
((SELECT id FROM public.categories WHERE slug='product'), 'A key metric drops 20% overnight. How do you investigate?', 'hard', 'Segment, recent changes, instrumentation, external factors.', 8),
((SELECT id FROM public.categories WHERE slug='dsa'), 'Reverse a linked list.', 'easy', 'Three pointers (prev, curr, next). O(n) time, O(1) space.', 5),
((SELECT id FROM public.categories WHERE slug='dsa'), 'Implement an LRU cache.', 'medium', 'Hash map + doubly linked list for O(1) get and put.', 8),
((SELECT id FROM public.categories WHERE slug='dsa'), 'Detect a cycle in a linked list.', 'medium', 'Floyd''s tortoise and hare. O(n) time, O(1) space.', 5),
((SELECT id FROM public.categories WHERE slug='career'), 'Why do you want to work here?', 'easy', 'Connect the company mission and role to your goals with specifics.', 3),
((SELECT id FROM public.categories WHERE slug='career'), 'Where do you see yourself in five years?', 'easy', 'Show ambition aligned with the role; avoid sounding like you will leave soon.', 3),
((SELECT id FROM public.categories WHERE slug='cs-fundamentals'), 'What is a deadlock and what are the four necessary conditions?', 'medium', 'Mutual exclusion, hold and wait, no preemption, circular wait. Mention prevention.', 5),
((SELECT id FROM public.categories WHERE slug='cs-fundamentals'), 'Explain database normalization up to 3NF.', 'medium', 'Remove repeating groups, partial and transitive dependencies. Give an example table.', 6),
((SELECT id FROM public.categories WHERE slug='cs-fundamentals'), 'What happens when you type a URL into a browser?', 'medium', 'DNS, TCP handshake, TLS, HTTP request, rendering.', 7),
((SELECT id FROM public.categories WHERE slug='cs-fundamentals'), 'Explain the four pillars of OOP.', 'easy', 'Encapsulation, abstraction, inheritance, polymorphism — with examples.', 4),
((SELECT id FROM public.categories WHERE slug='cs-fundamentals'), 'What is virtual memory and how does paging work?', 'hard', 'Page tables, TLB, page faults, replacement policies.', 7);