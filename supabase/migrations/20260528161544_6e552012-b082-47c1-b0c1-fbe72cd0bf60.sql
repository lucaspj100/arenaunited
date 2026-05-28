
-- 1. Remover colunas de automação
ALTER TABLE public.financial_settings DROP COLUMN IF EXISTS general_automation_cost;
ALTER TABLE public.seller_financial_settings DROP COLUMN IF EXISTS monthly_automation_cost;

-- 2. Adicionar salário e outros custos em seller_financial_settings
ALTER TABLE public.seller_financial_settings
  ADD COLUMN IF NOT EXISTS manager_user_id uuid,
  ADD COLUMN IF NOT EXISTS monthly_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_individual_costs numeric NOT NULL DEFAULT 0;

-- 3. Criar team_financial_settings
CREATE TABLE IF NOT EXISTS public.team_financial_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_user_id uuid NOT NULL UNIQUE,
  average_lifetime_months integer NOT NULL DEFAULT 8,
  contract_duration_months integer NOT NULL DEFAULT 18,
  cancellation_rate numeric NOT NULL DEFAULT 0.10,
  enrollment_fee_type text NOT NULL DEFAULT 'fixed',
  enrollment_fee_value numeric NOT NULL DEFAULT 0,
  school_retention_percentage numeric NOT NULL DEFAULT 0,
  general_tools_cost numeric NOT NULL DEFAULT 0,
  paid_traffic_cost numeric NOT NULL DEFAULT 0,
  other_commercial_costs numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_financial_settings TO authenticated;
GRANT ALL ON public.team_financial_settings TO service_role;

ALTER TABLE public.team_financial_settings ENABLE ROW LEVEL SECURITY;

-- Staff full access
CREATE POLICY team_fin_staff_all ON public.team_financial_settings
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Manager owns their row
CREATE POLICY team_fin_manager_select ON public.team_financial_settings
  FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

CREATE POLICY team_fin_manager_insert ON public.team_financial_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    manager_user_id = auth.uid()
    AND (public.is_director_like(auth.uid()) OR public.has_role(auth.uid(), 'franqueado'::public.app_role))
  );

CREATE POLICY team_fin_manager_update ON public.team_financial_settings
  FOR UPDATE TO authenticated
  USING (manager_user_id = auth.uid())
  WITH CHECK (manager_user_id = auth.uid());

CREATE POLICY team_fin_manager_delete ON public.team_financial_settings
  FOR DELETE TO authenticated
  USING (manager_user_id = auth.uid());

-- Vendedor managed by this manager can read team settings
CREATE POLICY team_fin_seller_select ON public.team_financial_settings
  FOR SELECT TO authenticated
  USING (public.manages_seller(manager_user_id, public.current_seller_id()));

CREATE TRIGGER team_financial_settings_touch
  BEFORE UPDATE ON public.team_financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
