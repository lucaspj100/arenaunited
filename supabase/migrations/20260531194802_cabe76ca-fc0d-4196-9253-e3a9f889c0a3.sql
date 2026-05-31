-- Add manager (gerente) link per seller, so franqueados can assign which
-- gerente each consultor reports to. This drives the manager commission
-- calculation in the financial calculator.

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS manager_seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sellers_manager_seller_id_idx
  ON public.sellers (manager_seller_id);

-- Allow franqueados / gestores que gerenciam o vendedor a editar o registro
-- do vendedor (na prática, restrito pelo trigger enforce_seller_update_scope
-- a campos não-sensíveis como manager_seller_id, nome e avatar).
DROP POLICY IF EXISTS sellers_manager_update ON public.sellers;
CREATE POLICY sellers_manager_update
  ON public.sellers
  FOR UPDATE
  TO authenticated
  USING (public.manages_seller(auth.uid(), id))
  WITH CHECK (public.manages_seller(auth.uid(), id));