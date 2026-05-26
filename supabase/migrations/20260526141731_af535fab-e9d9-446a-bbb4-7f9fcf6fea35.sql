
-- Add app_role column to allowed_emails so admin can invite someone directly as 'diretor'
ALTER TABLE public.allowed_emails
  ADD COLUMN IF NOT EXISTS app_role public.app_role NOT NULL DEFAULT 'vendedor';

-- Update signup trigger to respect app_role from invite
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.allowed_emails%ROWTYPE;
  v_is_staff boolean;
  v_target_role public.app_role;
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

  v_target_role := COALESCE(v_invite.app_role, 'vendedor'::public.app_role);

  -- Diretores não viram vendedor: só recebem o papel administrativo.
  IF v_target_role = 'vendedor'::public.app_role THEN
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
$$;
