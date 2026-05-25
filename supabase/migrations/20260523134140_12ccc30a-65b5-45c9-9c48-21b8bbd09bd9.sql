
-- 1. Restrict sellers SELECT to authenticated users only (was public)
DROP POLICY IF EXISTS sellers_public_select ON public.sellers;
CREATE POLICY sellers_authenticated_select
  ON public.sellers FOR SELECT
  TO authenticated
  USING (true);

-- 2. Tighten vendedor UPDATE policy to require vendedor role
DROP POLICY IF EXISTS interviews_vendedor_update_own ON public.interviews;
CREATE POLICY interviews_vendedor_update_own
  ON public.interviews FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role) AND seller_id = current_seller_id())
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role) AND seller_id = current_seller_id());

-- 3. Revoke EXECUTE on SECURITY DEFINER helpers from anon (keep authenticated)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_seller_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_seller_id() TO authenticated;
