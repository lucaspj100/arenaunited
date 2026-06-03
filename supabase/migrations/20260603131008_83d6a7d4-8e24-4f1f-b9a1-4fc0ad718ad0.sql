-- Permite que diretor-like e franqueado criem novos vendedores vinculados a si mesmos,
-- e editem/excluam os vendedores que eles próprios criaram (director_id = auth.uid()).

DROP POLICY IF EXISTS sellers_owner_manager_insert ON public.sellers;
CREATE POLICY sellers_owner_manager_insert ON public.sellers
  FOR INSERT TO authenticated
  WITH CHECK (
    director_id = auth.uid()
    AND (
      public.is_director_like(auth.uid())
      OR public.has_role(auth.uid(), 'franqueado'::public.app_role)
    )
  );

DROP POLICY IF EXISTS sellers_owner_manager_update ON public.sellers;
CREATE POLICY sellers_owner_manager_update ON public.sellers
  FOR UPDATE TO authenticated
  USING (
    director_id = auth.uid()
    AND (
      public.is_director_like(auth.uid())
      OR public.has_role(auth.uid(), 'franqueado'::public.app_role)
    )
  )
  WITH CHECK (
    director_id = auth.uid()
    AND (
      public.is_director_like(auth.uid())
      OR public.has_role(auth.uid(), 'franqueado'::public.app_role)
    )
  );

DROP POLICY IF EXISTS sellers_owner_manager_delete ON public.sellers;
CREATE POLICY sellers_owner_manager_delete ON public.sellers
  FOR DELETE TO authenticated
  USING (
    director_id = auth.uid()
    AND (
      public.is_director_like(auth.uid())
      OR public.has_role(auth.uid(), 'franqueado'::public.app_role)
    )
  );
