
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'presidente';

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','diretor','ceo','presidente')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_director_like(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('diretor','ceo','presidente')
  )
$$;

DROP POLICY IF EXISTS sellers_diretor_update_own_team ON public.sellers;
CREATE POLICY sellers_diretor_update_own_team ON public.sellers
  FOR UPDATE TO authenticated
  USING (public.is_director_like(auth.uid()) AND director_id = auth.uid())
  WITH CHECK (public.is_director_like(auth.uid()) AND director_id = auth.uid());

DROP POLICY IF EXISTS enrollments_diretor_select ON public.enrollments;
CREATE POLICY enrollments_diretor_select ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.is_director_like(auth.uid()) AND public.is_director_of(seller_id));

DROP POLICY IF EXISTS enrollments_diretor_insert ON public.enrollments;
CREATE POLICY enrollments_diretor_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_director_like(auth.uid()) AND public.is_director_of(seller_id));

DROP POLICY IF EXISTS enrollments_diretor_update ON public.enrollments;
CREATE POLICY enrollments_diretor_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (public.is_director_like(auth.uid()) AND public.is_director_of(seller_id))
  WITH CHECK (public.is_director_like(auth.uid()) AND public.is_director_of(seller_id));

DROP POLICY IF EXISTS enrollments_diretor_delete ON public.enrollments;
CREATE POLICY enrollments_diretor_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (public.is_director_like(auth.uid()) AND public.is_director_of(seller_id));
