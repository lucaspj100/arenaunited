
-- 1. allowed_emails table
CREATE TABLE public.allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role public.seller_role NOT NULL DEFAULT 'consultor',
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX allowed_emails_email_lower_idx ON public.allowed_emails (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY allowed_emails_admin_all ON public.allowed_emails
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Trigger: on auth user signup, validate email & create seller + role
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.allowed_emails%ROWTYPE;
  v_is_admin boolean;
BEGIN
  -- Skip if this user already has an admin role (admin bootstrap path)
  v_is_admin := EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin');
  IF v_is_admin THEN
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

  -- Create seller row linked to this user
  INSERT INTO public.sellers (name, user_id, role, sort_index)
  VALUES (
    v_invite.name,
    NEW.id,
    v_invite.role,
    COALESCE((SELECT COALESCE(MAX(sort_index), 0) + 1 FROM public.sellers), 1)
  );

  -- Assign vendedor role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor')
  ON CONFLICT DO NOTHING;

  -- Mark invite as used
  UPDATE public.allowed_emails
  SET used_at = now(), used_by = NEW.id
  WHERE id = v_invite.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_signup ON auth.users;
CREATE TRIGGER on_auth_user_created_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- 3. Update enforce_seller_update_scope: allow vendedor to edit own name & avatar
CREATE OR REPLACE FUNCTION public.enforce_seller_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_own_row boolean;
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

  is_own_row := (OLD.user_id = auth.uid());

  -- Vendedor never allowed to change protected fields
  IF NEW.deals IS DISTINCT FROM OLD.deals
     OR NEW.material IS DISTINCT FROM OLD.material
     OR NEW.goal_deals IS DISTINCT FROM OLD.goal_deals
     OR NEW.goal_material IS DISTINCT FROM OLD.goal_material
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.sort_index IS DISTINCT FROM OLD.sort_index
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Vendedor só pode editar nome, foto, entrevistas marcadas, realizadas e matrículas.';
  END IF;

  -- Name & avatar editable only on own row
  IF (NEW.name IS DISTINCT FROM OLD.name OR NEW.avatar IS DISTINCT FROM OLD.avatar)
     AND NOT is_own_row THEN
    RAISE EXCEPTION 'Você só pode editar seu próprio perfil.';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
