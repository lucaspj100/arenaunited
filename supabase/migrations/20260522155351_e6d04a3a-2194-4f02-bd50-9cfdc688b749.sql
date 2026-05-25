
-- Enum de status
DO $$ BEGIN
  CREATE TYPE public.interview_status AS ENUM (
    'marcada','realizada','fechada','nao_compareceu','reagendada','perdida'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela interviews
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  lead_name text NOT NULL,
  lead_phone text,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  status public.interview_status NOT NULL DEFAULT 'marcada',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interviews_seller_date_idx
  ON public.interviews (seller_id, scheduled_date);
CREATE INDEX IF NOT EXISTS interviews_date_time_idx
  ON public.interviews (scheduled_date, scheduled_time);

-- Trigger updated_at
DROP TRIGGER IF EXISTS interviews_touch_updated_at ON public.interviews;
CREATE TRIGGER interviews_touch_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Função auxiliar: seller_id do usuário atual
CREATE OR REPLACE FUNCTION public.current_seller_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.sellers WHERE user_id = auth.uid() LIMIT 1
$$;

-- Trigger que restringe colunas editáveis pelo vendedor
CREATE OR REPLACE FUNCTION public.enforce_interview_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Vendedor: só status e notes
  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.lead_name IS DISTINCT FROM OLD.lead_name
     OR NEW.lead_phone IS DISTINCT FROM OLD.lead_phone
     OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
     OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    RAISE EXCEPTION 'Vendedor só pode alterar status e observações da entrevista.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS interviews_enforce_update_scope ON public.interviews;
CREATE TRIGGER interviews_enforce_update_scope
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_interview_update_scope();

-- RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interviews_select ON public.interviews;
CREATE POLICY interviews_select ON public.interviews
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR seller_id = public.current_seller_id()
  );

DROP POLICY IF EXISTS interviews_admin_insert ON public.interviews;
CREATE POLICY interviews_admin_insert ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS interviews_vendedor_insert_own ON public.interviews;
CREATE POLICY interviews_vendedor_insert_own ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'vendedor')
    AND seller_id = public.current_seller_id()
  );

DROP POLICY IF EXISTS interviews_admin_update ON public.interviews;
CREATE POLICY interviews_admin_update ON public.interviews
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS interviews_vendedor_update_own ON public.interviews;
CREATE POLICY interviews_vendedor_update_own ON public.interviews
  FOR UPDATE TO authenticated
  USING (seller_id = public.current_seller_id())
  WITH CHECK (seller_id = public.current_seller_id());

DROP POLICY IF EXISTS interviews_admin_delete ON public.interviews;
CREATE POLICY interviews_admin_delete ON public.interviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- View de estatísticas semanais (segunda -> domingo)
CREATE OR REPLACE VIEW public.weekly_seller_stats AS
SELECT
  s.id AS seller_id,
  COALESCE(SUM(CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS week_scheduled,
  COALESCE(SUM(CASE WHEN i.status IN ('realizada','fechada') THEN 1 ELSE 0 END), 0)::int AS week_completed,
  COALESCE(SUM(CASE WHEN i.status = 'fechada' THEN 1 ELSE 0 END), 0)::int AS week_enrollments
FROM public.sellers s
LEFT JOIN public.interviews i
  ON i.seller_id = s.id
 AND i.scheduled_date >= date_trunc('week', current_date)::date
 AND i.scheduled_date <  (date_trunc('week', current_date) + interval '7 days')::date
GROUP BY s.id;

GRANT SELECT ON public.weekly_seller_stats TO anon, authenticated;
