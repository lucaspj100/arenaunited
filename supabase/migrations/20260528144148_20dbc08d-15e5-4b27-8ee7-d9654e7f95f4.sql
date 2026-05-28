-- Permitir que staff (admin, ceo, presidente, diretor) gerenciem matrículas de qualquer vendedor
DROP POLICY IF EXISTS enrollments_diretor_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_diretor_insert ON public.enrollments;
DROP POLICY IF EXISTS enrollments_diretor_update ON public.enrollments;
DROP POLICY IF EXISTS enrollments_diretor_delete ON public.enrollments;

CREATE POLICY enrollments_staff_select ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY enrollments_staff_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY enrollments_staff_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY enrollments_staff_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));