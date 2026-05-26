-- Remove anonymous read access to sellers (exposed user_ids, director hierarchy, commission rates)
DROP POLICY IF EXISTS sellers_public_select ON public.sellers;
REVOKE SELECT ON public.sellers FROM anon;

-- Tighten enrollments vendedor select policy to require the vendedor role
DROP POLICY IF EXISTS enrollments_vendedor_select ON public.enrollments;
CREATE POLICY enrollments_vendedor_select
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND seller_id = current_seller_id()
);