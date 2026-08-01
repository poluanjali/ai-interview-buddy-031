CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  branch text,
  graduation_year integer,
  target_role text,
  weak_areas text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'quick',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  role text,
  company text,
  difficulty text NOT NULL DEFAULT 'medium',
  topics text[] DEFAULT '{}',
  settings jsonb DEFAULT '{}',
  current_stage text NOT NULL DEFAULT 'introduction',
  overall_score integer,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own interviews" ON public.interviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.interview_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('ai', 'user')),
  content text NOT NULL,
  stage text NOT NULL,
  scores jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_messages TO authenticated;
GRANT ALL ON public.interview_messages TO service_role;
ALTER TABLE public.interview_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages in their own interviews" ON public.interview_messages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_messages.interview_id AND interviews.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_messages.interview_id AND interviews.user_id = auth.uid())
);

CREATE TABLE public.interview_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  overall_score integer,
  category_scores jsonb DEFAULT '{}',
  strengths text[] DEFAULT '{}',
  weaknesses text[] DEFAULT '{}',
  summary text,
  recommended_resources text[] DEFAULT '{}',
  sample_answers jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_reports TO authenticated;
GRANT ALL ON public.interview_reports TO service_role;
ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reports for their own interviews" ON public.interview_reports FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_reports.interview_id AND interviews.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.interviews WHERE interviews.id = interview_reports.interview_id AND interviews.user_id = auth.uid())
);

CREATE TABLE public.user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  total_attempts integer NOT NULL DEFAULT 0,
  average_score integer,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own progress" ON public.user_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  question text NOT NULL,
  expected_keywords text[] DEFAULT '{}',
  model_answer text,
  company_tag text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read question bank" ON public.question_bank FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_interview_reports_updated_at BEFORE UPDATE ON public.interview_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.question_bank (topic, difficulty, question, expected_keywords, tags) VALUES
  ('introduction', 'easy', 'Tell me about yourself and your background.', ARRAY['background', 'education', 'skills', 'interests'], ARRAY['introduction']),
  ('hr', 'easy', 'Why do you want to work for this company?', ARRAY['company', 'values', 'growth', 'role'], ARRAY['hr']),
  ('hr', 'medium', 'Where do you see yourself in five years?', ARRAY['career', 'goals', 'growth', 'learning'], ARRAY['hr']),
  ('hr', 'medium', 'Describe a time you handled a conflict in a team.', ARRAY['conflict', 'team', 'communication', 'resolution'], ARRAY['hr']),
  ('dsa', 'easy', 'What is the difference between an array and a linked list?', ARRAY['array', 'linked list', 'memory', 'index'], ARRAY['dsa']),
  ('dsa', 'medium', 'Explain how a hash map works and give a use case.', ARRAY['hash', 'key', 'value', 'collision', 'lookup'], ARRAY['dsa']),
  ('dsa', 'hard', 'How would you find the shortest path in an unweighted graph?', ARRAY['bfs', 'graph', 'shortest path', 'queue'], ARRAY['dsa']),
  ('oops', 'easy', 'What are the four pillars of object-oriented programming?', ARRAY['encapsulation', 'inheritance', 'polymorphism', 'abstraction'], ARRAY['oops']),
  ('oops', 'medium', 'Explain the difference between abstraction and encapsulation.', ARRAY['abstraction', 'encapsulation', 'hide', 'interface'], ARRAY['oops']),
  ('dbms', 'easy', 'What is a primary key and why is it important?', ARRAY['primary key', 'unique', 'identifier', 'table'], ARRAY['dbms']),
  ('dbms', 'medium', 'Explain SQL joins with examples.', ARRAY['inner', 'outer', 'left', 'right', 'join'], ARRAY['dbms']),
  ('os', 'medium', 'What is the difference between a process and a thread?', ARRAY['process', 'thread', 'memory', 'execution'], ARRAY['os']),
  ('networking', 'medium', 'Explain how the HTTP request-response cycle works.', ARRAY['http', 'request', 'response', 'server', 'client'], ARRAY['networking']),
  ('system design', 'hard', 'How would you design a URL shortener?', ARRAY['hash', 'database', 'scale', 'cache', 'api'], ARRAY['system design']);
