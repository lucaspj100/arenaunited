
-- Enum de cargo
DO $$ BEGIN
  CREATE TYPE public.seller_role AS ENUM ('consultor', 'gerente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Coluna role em sellers
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS role public.seller_role NOT NULL DEFAULT 'consultor';

-- Estender trigger enforce_seller_update_scope para bloquear role para não-admin
CREATE OR REPLACE FUNCTION public.enforce_seller_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
BEGIN
  IF NEW.week_scheduled < 0 OR NEW.week_completed < 0 OR NEW.week_enrollments < 0 THEN
    RAISE EXCEPTION 'Os valores semanais não podem ser negativos.';
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin');
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.avatar IS DISTINCT FROM OLD.avatar
     OR NEW.deals IS DISTINCT FROM OLD.deals
     OR NEW.material IS DISTINCT FROM OLD.material
     OR NEW.goal_deals IS DISTINCT FROM OLD.goal_deals
     OR NEW.goal_material IS DISTINCT FROM OLD.goal_material
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.sort_index IS DISTINCT FROM OLD.sort_index
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Vendedor só pode editar entrevistas marcadas, realizadas e matrículas.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Tabela enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  enrollment_date DATE NOT NULL,
  enrollment_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (enrollment_value >= 0),
  monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  material_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (material_value >= 0),
  role_snapshot public.seller_role NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enrollments_seller_id_idx ON public.enrollments(seller_id);
CREATE INDEX IF NOT EXISTS enrollments_date_idx ON public.enrollments(enrollment_date);

-- Trigger updated_at
DROP TRIGGER IF EXISTS enrollments_touch_updated_at ON public.enrollments;
CREATE TRIGGER enrollments_touch_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Função: calcula automaticamente role_snapshot, rate e amount
CREATE OR REPLACE FUNCTION public.enrollments_apply_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.seller_role;
  v_rate NUMERIC(5,4);
BEGIN
  IF NEW.student_name IS NULL OR length(trim(NEW.student_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do aluno é obrigatório.';
  END IF;
  IF NEW.enrollment_date IS NULL THEN
    RAISE EXCEPTION 'Data da matrícula é obrigatória.';
  END IF;

  SELECT role INTO v_role FROM public.sellers WHERE id = NEW.seller_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Vendedor inválido.';
  END IF;

  v_rate := CASE v_role
    WHEN 'gerente'::public.seller_role THEN 0.53
    ELSE 0.30
  END;

  NEW.role_snapshot := v_role;
  NEW.commission_rate := v_rate;
  NEW.commission_amount := ROUND(NEW.enrollment_value * v_rate, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_apply_commission_trg ON public.enrollments;
CREATE TRIGGER enrollments_apply_commission_trg
BEFORE INSERT OR UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.enrollments_apply_commission();

-- RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enrollments_admin_all ON public.enrollments;
CREATE POLICY enrollments_admin_all ON public.enrollments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS enrollments_vendedor_select ON public.enrollments;
CREATE POLICY enrollments_vendedor_select ON public.enrollments
  FOR SELECT TO authenticated
  USING (seller_id = public.current_seller_id());

DROP POLICY IF EXISTS enrollments_vendedor_insert ON public.enrollments;
CREATE POLICY enrollments_vendedor_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'vendedor')
    AND seller_id = public.current_seller_id()
  );

DROP POLICY IF EXISTS enrollments_vendedor_update ON public.enrollments;
CREATE POLICY enrollments_vendedor_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendedor')
    AND seller_id = public.current_seller_id()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'vendedor')
    AND seller_id = public.current_seller_id()
  );

DROP POLICY IF EXISTS enrollments_vendedor_delete ON public.enrollments;
CREATE POLICY enrollments_vendedor_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendedor')
    AND seller_id = public.current_seller_id()
  );
