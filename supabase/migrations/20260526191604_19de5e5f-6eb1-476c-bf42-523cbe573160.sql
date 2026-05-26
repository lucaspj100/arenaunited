
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'franqueado';

CREATE OR REPLACE FUNCTION public.is_seller_like(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('vendedor','franqueado')
  )
$$;

DROP POLICY IF EXISTS enrollments_vendedor_select ON public.enrollments;
CREATE POLICY enrollments_vendedor_select ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id());

DROP POLICY IF EXISTS enrollments_vendedor_insert ON public.enrollments;
CREATE POLICY enrollments_vendedor_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id());

DROP POLICY IF EXISTS enrollments_vendedor_update ON public.enrollments;
CREATE POLICY enrollments_vendedor_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id())
  WITH CHECK (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id());

DROP POLICY IF EXISTS enrollments_vendedor_delete ON public.enrollments;
CREATE POLICY enrollments_vendedor_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id());

DROP POLICY IF EXISTS interviews_vendedor_insert_own ON public.interviews;
CREATE POLICY interviews_vendedor_insert_own ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id());

DROP POLICY IF EXISTS interviews_vendedor_update_own ON public.interviews;
CREATE POLICY interviews_vendedor_update_own ON public.interviews
  FOR UPDATE TO authenticated
  USING (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id())
  WITH CHECK (public.is_seller_like(auth.uid()) AND seller_id = public.current_seller_id());

DROP POLICY IF EXISTS sellers_vendedor_update_own ON public.sellers;
CREATE POLICY sellers_vendedor_update_own ON public.sellers
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) AND public.is_seller_like(auth.uid()))
  WITH CHECK ((user_id = auth.uid()) AND public.is_seller_like(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_invite public.allowed_emails%ROWTYPE;
  v_is_staff boolean;
  v_target_role public.app_role;
BEGIN
  v_is_staff := EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role::text IN ('admin','diretor','ceo','presidente')
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

  v_target_role := COALESCE(v_invite.app_role, 'vendedor'::public.app_role);

  IF v_target_role::text IN ('vendedor','franqueado') THEN
    INSERT INTO public.sellers (name, user_id, role, sort_index)
    VALUES (
      v_invite.name,
      NEW.id,
      v_invite.role,
      COALESCE((SELECT COALESCE(MAX(sort_index), 0) + 1 FROM public.sellers), 1)
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_target_role)
  ON CONFLICT DO NOTHING;

  UPDATE public.allowed_emails
  SET used_at = now(), used_by = NEW.id
  WHERE id = v_invite.id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_seller_profile()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite public.allowed_emails%ROWTYPE;
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado.';
  END IF;

  IF NOT public.is_seller_like(v_user_id) THEN
    RAISE EXCEPTION 'Apenas vendedores ou franqueados podem se vincular ao ranking.';
  END IF;

  SELECT id INTO v_existing_id FROM public.sellers WHERE user_id = v_user_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Não foi possível identificar seu e-mail.';
  END IF;

  SELECT * INTO v_invite
  FROM public.allowed_emails
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Seu e-mail não está liberado em Acessos. Peça ao administrador.';
  END IF;

  INSERT INTO public.sellers (name, user_id, role, sort_index)
  VALUES (
    COALESCE(v_invite.name, split_part(v_email, '@', 1)),
    v_user_id,
    COALESCE(v_invite.role, 'consultor'::public.seller_role),
    COALESCE((SELECT MAX(sort_index) + 1 FROM public.sellers), 1)
  )
  RETURNING id INTO v_new_id;

  UPDATE public.allowed_emails
  SET used_at = COALESCE(used_at, now()), used_by = COALESCE(used_by, v_user_id)
  WHERE id = v_invite.id;

  RETURN v_new_id;
END;
$function$;
