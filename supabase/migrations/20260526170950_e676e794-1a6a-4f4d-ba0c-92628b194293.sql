
CREATE OR REPLACE FUNCTION public.claim_seller_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF NOT public.has_role(v_user_id, 'vendedor'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas vendedores podem se vincular ao ranking.';
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
$$;

GRANT EXECUTE ON FUNCTION public.claim_seller_profile() TO authenticated;
