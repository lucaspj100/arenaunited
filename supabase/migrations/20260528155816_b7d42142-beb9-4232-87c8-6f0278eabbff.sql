
-- =========================================================
-- 1. TABELA: team_seller_links
-- =========================================================
CREATE TABLE public.team_seller_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id uuid NOT NULL,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE UNIQUE INDEX team_seller_links_one_active_per_seller
  ON public.team_seller_links (seller_id) WHERE active;

CREATE INDEX team_seller_links_manager_idx
  ON public.team_seller_links (manager_user_id) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_seller_links TO authenticated;
GRANT ALL ON public.team_seller_links TO service_role;

ALTER TABLE public.team_seller_links ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_team_seller_links_touch
  BEFORE UPDATE ON public.team_seller_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 2. TABELA: financial_settings (single-row)
-- =========================================================
CREATE TABLE public.financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  average_lifetime_months integer NOT NULL DEFAULT 8,
  contract_duration_months integer NOT NULL DEFAULT 18,
  cancellation_rate numeric(5,4) NOT NULL DEFAULT 0.10,
  general_automation_cost numeric(12,2) NOT NULL DEFAULT 0,
  general_tools_cost numeric(12,2) NOT NULL DEFAULT 0,
  paid_traffic_cost numeric(12,2) NOT NULL DEFAULT 0,
  other_commercial_costs numeric(12,2) NOT NULL DEFAULT 0,
  default_enrollment_fee_type text NOT NULL DEFAULT 'fixed' CHECK (default_enrollment_fee_type IN ('fixed','percent')),
  default_enrollment_fee_value numeric(12,2) NOT NULL DEFAULT 0,
  default_school_retention_percentage numeric(5,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_settings TO authenticated;
GRANT ALL ON public.financial_settings TO service_role;

ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_financial_settings_touch
  BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.financial_settings (id) VALUES (gen_random_uuid());

-- =========================================================
-- 3. TABELA: seller_financial_settings
-- =========================================================
CREATE TABLE public.seller_financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE REFERENCES public.sellers(id) ON DELETE CASCADE,
  monthly_automation_cost numeric(12,2) NOT NULL DEFAULT 0,
  monthly_tools_cost numeric(12,2) NOT NULL DEFAULT 0,
  financial_notes text,
  active_for_financial_analysis boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_financial_settings TO authenticated;
GRANT ALL ON public.seller_financial_settings TO service_role;

ALTER TABLE public.seller_financial_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_seller_financial_settings_touch
  BEFORE UPDATE ON public.seller_financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 4. FUNÇÕES AUXILIARES
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_team_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','diretor','ceo','presidente','franqueado')
  )
$$;

CREATE OR REPLACE FUNCTION public.manages_seller(_user_id uuid, _seller_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_seller_links
    WHERE manager_user_id = _user_id
      AND seller_id = _seller_id
      AND active
  ) OR EXISTS (
    SELECT 1 FROM public.sellers
    WHERE id = _seller_id
      AND director_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_seller(_seller_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_staff(auth.uid())
    OR public.manages_seller(auth.uid(), _seller_id)
    OR EXISTS (
      SELECT 1 FROM public.sellers
      WHERE id = _seller_id AND user_id = auth.uid()
    )
$$;

-- =========================================================
-- 5. POLICIES: team_seller_links
-- =========================================================
CREATE POLICY team_links_staff_all ON public.team_seller_links
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY team_links_manager_select ON public.team_seller_links
  FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

CREATE POLICY team_links_manager_insert ON public.team_seller_links
  FOR INSERT TO authenticated
  WITH CHECK (
    manager_user_id = auth.uid()
    AND (public.is_director_like(auth.uid()) OR public.has_role(auth.uid(),'franqueado'::public.app_role))
  );

CREATE POLICY team_links_manager_update ON public.team_seller_links
  FOR UPDATE TO authenticated
  USING (
    manager_user_id = auth.uid()
    AND (public.is_director_like(auth.uid()) OR public.has_role(auth.uid(),'franqueado'::public.app_role))
  )
  WITH CHECK (
    manager_user_id = auth.uid()
    AND (public.is_director_like(auth.uid()) OR public.has_role(auth.uid(),'franqueado'::public.app_role))
  );

CREATE POLICY team_links_manager_delete ON public.team_seller_links
  FOR DELETE TO authenticated
  USING (
    manager_user_id = auth.uid()
    AND (public.is_director_like(auth.uid()) OR public.has_role(auth.uid(),'franqueado'::public.app_role))
  );

CREATE POLICY team_links_seller_self_select ON public.team_seller_links
  FOR SELECT TO authenticated
  USING (seller_id = public.current_seller_id());

-- =========================================================
-- 6. POLICIES: financial_settings
-- =========================================================
CREATE POLICY financial_settings_read_all ON public.financial_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY financial_settings_staff_write ON public.financial_settings
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================
-- 7. POLICIES: seller_financial_settings
-- =========================================================
CREATE POLICY seller_fin_select ON public.seller_financial_settings
  FOR SELECT TO authenticated
  USING (public.user_can_access_seller(seller_id));

CREATE POLICY seller_fin_staff_all ON public.seller_financial_settings
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY seller_fin_manager_insert ON public.seller_financial_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.manages_seller(auth.uid(), seller_id));

CREATE POLICY seller_fin_manager_update ON public.seller_financial_settings
  FOR UPDATE TO authenticated
  USING (public.manages_seller(auth.uid(), seller_id))
  WITH CHECK (public.manages_seller(auth.uid(), seller_id));

CREATE POLICY seller_fin_manager_delete ON public.seller_financial_settings
  FOR DELETE TO authenticated
  USING (public.manages_seller(auth.uid(), seller_id));
