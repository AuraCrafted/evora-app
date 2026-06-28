CREATE TABLE public.custom_suggestions (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT 'Your own evora.',
  minutes INTEGER NOT NULL,
  effort TEXT NOT NULL DEFAULT 'low',
  time_of_day TEXT[] NOT NULL DEFAULT ARRAY['morning','midday','evening','night'],
  tags TEXT[] NOT NULL DEFAULT ARRAY['quick'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX custom_suggestions_user_id_idx ON public.custom_suggestions(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_suggestions TO authenticated;
GRANT ALL ON public.custom_suggestions TO service_role;

ALTER TABLE public.custom_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own custom suggestions"
  ON public.custom_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own custom suggestions"
  ON public.custom_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own custom suggestions"
  ON public.custom_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own custom suggestions"
  ON public.custom_suggestions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_custom_suggestions_updated_at
  BEFORE UPDATE ON public.custom_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();