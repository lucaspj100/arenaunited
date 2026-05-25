
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  deals INTEGER NOT NULL DEFAULT 0,
  material NUMERIC NOT NULL DEFAULT 0,
  goal_deals INTEGER NOT NULL DEFAULT 20,
  goal_material NUMERIC NOT NULL DEFAULT 30000,
  score NUMERIC NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  sort_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sellers" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "Public insert sellers" ON public.sellers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update sellers" ON public.sellers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete sellers" ON public.sellers FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER sellers_touch_updated_at BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sellers;
ALTER TABLE public.sellers REPLICA IDENTITY FULL;
