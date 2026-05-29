
DROP POLICY IF EXISTS team_links_manager_insert ON public.team_seller_links;
DROP POLICY IF EXISTS team_links_manager_update ON public.team_seller_links;
DROP POLICY IF EXISTS team_links_manager_delete ON public.team_seller_links;

CREATE POLICY team_links_admin_ceo_insert ON public.team_seller_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'ceo'::public.app_role));

CREATE POLICY team_links_admin_ceo_update ON public.team_seller_links
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'ceo'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'ceo'::public.app_role));

CREATE POLICY team_links_admin_ceo_delete ON public.team_seller_links
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'ceo'::public.app_role));
