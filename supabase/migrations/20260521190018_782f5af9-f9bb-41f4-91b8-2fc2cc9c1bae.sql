
-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Policies em user_roles
CREATE POLICY "user_roles_self_select"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_all"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Coluna user_id em sellers
ALTER TABLE public.sellers
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX sellers_user_id_unique
  ON public.sellers(user_id)
  WHERE user_id IS NOT NULL;

-- 6. Substituir policies antigas de sellers
DROP POLICY IF EXISTS "Public delete sellers" ON public.sellers;
DROP POLICY IF EXISTS "Public insert sellers" ON public.sellers;
DROP POLICY IF EXISTS "Public update sellers" ON public.sellers;
DROP POLICY IF EXISTS "Public read sellers" ON public.sellers;

-- Leitura pública (ranking continua acessível)
CREATE POLICY "sellers_public_select"
  ON public.sellers FOR SELECT
  USING (true);

-- Admin pode tudo
CREATE POLICY "sellers_admin_insert"
  ON public.sellers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sellers_admin_update"
  ON public.sellers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sellers_admin_delete"
  ON public.sellers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vendedor: pode atualizar apenas a própria linha
CREATE POLICY "sellers_vendedor_update_own"
  ON public.sellers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'vendedor'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'vendedor'));

-- 7. Trigger que restringe as colunas alteráveis pelo vendedor e valida >= 0
CREATE OR REPLACE FUNCTION public.enforce_seller_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Valida campos semanais sempre
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

  -- Não-admin: bloquear qualquer mudança fora dos 3 campos semanais
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.avatar IS DISTINCT FROM OLD.avatar
     OR NEW.deals IS DISTINCT FROM OLD.deals
     OR NEW.material IS DISTINCT FROM OLD.material
     OR NEW.goal_deals IS DISTINCT FROM OLD.goal_deals
     OR NEW.goal_material IS DISTINCT FROM OLD.goal_material
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.sort_index IS DISTINCT FROM OLD.sort_index
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Vendedor só pode editar entrevistas marcadas, realizadas e matrículas.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sellers_enforce_update_scope
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_seller_update_scope();
