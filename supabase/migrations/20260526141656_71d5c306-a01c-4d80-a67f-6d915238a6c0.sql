
-- Add in_my_team marker for sellers
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS in_my_team boolean NOT NULL DEFAULT false;

-- Helper: is the user staff (admin OR diretor)?
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::public.app_role, 'diretor'::public.app_role)
  )
$$;

-- enforce_seller_update_scope: staff (admin OR diretor) gets full update
CREATE OR REPLACE FUNCTION public.enforce_seller_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff boolean;
  is_own_row boolean;
BEGIN
  IF NEW.week_scheduled < 0 OR NEW.week_completed < 0 OR NEW.week_enrollments < 0 THEN
    RAISE EXCEPTION 'Os valores semanais não podem ser negativos.';
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_staff := public.is_staff(auth.uid());
  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  is_own_row := (OLD.user_id = auth.uid());

  IF NEW.deals IS DISTINCT FROM OLD.deals
     OR NEW.material IS DISTINCT FROM OLD.material
     OR NEW.goal_deals IS DISTINCT FROM OLD.goal_deals
     OR NEW.goal_material IS DISTINCT FROM OLD.goal_material
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.sort_index IS DISTINCT FROM OLD.sort_index
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.in_my_team IS DISTINCT FROM OLD.in_my_team THEN
    RAISE EXCEPTION 'Vendedor só pode editar nome, foto, entrevistas marcadas, realizadas e matrículas.';
  END IF;

  IF (NEW.name IS DISTINCT FROM OLD.name OR NEW.avatar IS DISTINCT FROM OLD.avatar)
     AND NOT is_own_row THEN
    RAISE EXCEPTION 'Você só pode editar seu próprio perfil.';
  END IF;

  RETURN NEW;
END;
$$;

-- enforce_interview_update_scope: staff gets full update
CREATE OR REPLACE FUNCTION public.enforce_interview_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

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

-- handle_new_user_signup: skip whitelist for staff bootstrap (admin OR diretor)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.allowed_emails%ROWTYPE;
  v_is_staff boolean;
BEGIN
  v_is_staff := EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role IN ('admin'::public.app_role, 'diretor'::public.app_role)
  );
  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_invite
  FROM public.allowed_emails
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Este e-mail não está autorizado. Peça ao administrador para liberar seu acesso.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este convite já foi utilizado.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.sellers (name, user_id, role, sort_index)
  VALUES (
    v_invite.name,
    NEW.id,
    v_invite.role,
    COALESCE((SELECT COALESCE(MAX(sort_index), 0) + 1 FROM public.sellers), 1)
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor')
  ON CONFLICT DO NOTHING;

  UPDATE public.allowed_emails
  SET used_at = now(), used_by = NEW.id
  WHERE id = v_invite.id;

  RETURN NEW;
END;
$$;

-- Replace admin-only policies with staff (admin OR diretor) policies.
-- Enrollments are intentionally NOT touched: diretor must not access team commissions.

-- sellers
DROP POLICY IF EXISTS sellers_admin_insert ON public.sellers;
DROP POLICY IF EXISTS sellers_admin_update ON public.sellers;
DROP POLICY IF EXISTS sellers_admin_delete ON public.sellers;

CREATE POLICY sellers_staff_insert ON public.sellers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY sellers_staff_update ON public.sellers
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY sellers_staff_delete ON public.sellers
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- interviews
DROP POLICY IF EXISTS interviews_admin_insert ON public.interviews;
DROP POLICY IF EXISTS interviews_admin_update ON public.interviews;
DROP POLICY IF EXISTS interviews_admin_delete ON public.interviews;
DROP POLICY IF EXISTS interviews_select ON public.interviews;

CREATE POLICY interviews_staff_insert ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY interviews_staff_update ON public.interviews
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY interviews_staff_delete ON public.interviews
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY interviews_select ON public.interviews
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR seller_id = public.current_seller_id());

-- allowed_emails
DROP POLICY IF EXISTS allowed_emails_admin_all ON public.allowed_emails;

CREATE POLICY allowed_emails_staff_all ON public.allowed_emails
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- user_roles: staff can manage
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;

CREATE POLICY user_roles_staff_all ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
