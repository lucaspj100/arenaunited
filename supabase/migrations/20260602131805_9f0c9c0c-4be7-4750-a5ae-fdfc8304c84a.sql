-- 1) Permitir que diretor/franqueado/ceo/presidente criem perfil de vendedor no ranking
CREATE OR REPLACE FUNCTION public.claim_seller_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite public.allowed_emails%ROWTYPE;
  v_existing_id uuid;
  v_new_id uuid;
  v_role public.seller_role;
  v_has_any_role boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id)
    INTO v_has_any_role;
  IF NOT v_has_any_role THEN
    RAISE EXCEPTION 'Seu usuário não tem nenhum papel ativo.';
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

  -- Diretor-like e franqueado entram como gerente por padrão; vendedor como consultor
  IF public.is_director_like(v_user_id) OR public.has_role(v_user_id, 'franqueado'::public.app_role) THEN
    v_role := COALESCE(v_invite.role, 'gerente'::public.seller_role);
  ELSE
    v_role := COALESCE(v_invite.role, 'consultor'::public.seller_role);
  END IF;

  INSERT INTO public.sellers (name, user_id, role, sort_index, director_id)
  VALUES (
    COALESCE(v_invite.name, split_part(v_email, '@', 1)),
    v_user_id,
    v_role,
    COALESCE((SELECT MAX(sort_index) + 1 FROM public.sellers), 1),
    CASE WHEN public.is_director_like(v_user_id) OR public.has_role(v_user_id, 'franqueado'::public.app_role)
         THEN v_user_id ELSE NULL END
  )
  RETURNING id INTO v_new_id;

  IF v_invite.id IS NOT NULL THEN
    UPDATE public.allowed_emails
    SET used_at = COALESCE(used_at, now()), used_by = COALESCE(used_by, v_user_id)
    WHERE id = v_invite.id;
  END IF;

  RETURN v_new_id;
END;
$function$;

-- 2) Permitir que o próprio dono do registro edite metas (goal_deals, goal_material)
CREATE OR REPLACE FUNCTION public.enforce_seller_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Dono do registro pode editar suas próprias metas
  IF is_own_row AND (
       NEW.goal_deals IS DISTINCT FROM OLD.goal_deals
    OR NEW.goal_material IS DISTINCT FROM OLD.goal_material
  ) THEN
    -- ok
    NULL;
  ELSIF NEW.goal_deals IS DISTINCT FROM OLD.goal_deals
     OR NEW.goal_material IS DISTINCT FROM OLD.goal_material THEN
    RAISE EXCEPTION 'Somente o dono do registro ou um administrador pode alterar metas.';
  END IF;

  IF NEW.deals IS DISTINCT FROM OLD.deals
     OR NEW.material IS DISTINCT FROM OLD.material
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.sort_index IS DISTINCT FROM OLD.sort_index
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.in_my_team IS DISTINCT FROM OLD.in_my_team THEN
    RAISE EXCEPTION 'Vendedor só pode editar nome, foto, metas próprias, entrevistas marcadas, realizadas e matrículas.';
  END IF;

  IF (NEW.name IS DISTINCT FROM OLD.name OR NEW.avatar IS DISTINCT FROM OLD.avatar)
     AND NOT is_own_row THEN
    RAISE EXCEPTION 'Você só pode editar seu próprio perfil.';
  END IF;

  RETURN NEW;
END;
$function$;