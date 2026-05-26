-- 1) Add per-seller commission rate override and director assignment
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS director_id UUID;

CREATE INDEX IF NOT EXISTS sellers_director_id_idx ON public.sellers(director_id);

-- 2) Update trigger to use seller's commission_rate when set
CREATE OR REPLACE FUNCTION public.enrollments_apply_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.seller_role;
  v_rate NUMERIC(5,4);
  v_override NUMERIC(5,4);
BEGIN
  IF NEW.student_name IS NULL OR length(trim(NEW.student_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do aluno é obrigatório.';
  END IF;
  IF NEW.enrollment_date IS NULL THEN
    RAISE EXCEPTION 'Data da matrícula é obrigatória.';
  END IF;

  SELECT role, commission_rate INTO v_role, v_override
  FROM public.sellers WHERE id = NEW.seller_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Vendedor inválido.';
  END IF;

  IF v_override IS NOT NULL AND v_override > 0 THEN
    v_rate := v_override;
  ELSE
    v_rate := CASE v_role
      WHEN 'gerente'::public.seller_role THEN 0.53
      ELSE 0.30
    END;
  END IF;

  NEW.role_snapshot := v_role;
  NEW.commission_rate := v_rate;
  NEW.commission_amount := ROUND(NEW.enrollment_value * v_rate, 2);
  RETURN NEW;
END;
$function$;

-- 3) Helper: current user is the director of a given seller
CREATE OR REPLACE FUNCTION public.is_director_of(_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sellers
    WHERE id = _seller_id AND director_id = auth.uid()
  )
$$;

-- 4) Sellers: allow diretor to update their own sellers (in addition to staff_update)
DROP POLICY IF EXISTS sellers_diretor_update_own_team ON public.sellers;
CREATE POLICY sellers_diretor_update_own_team
ON public.sellers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'diretor'::app_role) AND director_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'diretor'::app_role) AND director_id = auth.uid());

-- Allow diretor to keep editing only seller commission_rate (not other restricted fields)
-- The existing enforce_seller_update_scope trigger applies only to non-staff; diretor IS staff,
-- so trigger lets them through. Good.

-- 5) Enrollments: diretor full CRUD only for their own sellers
DROP POLICY IF EXISTS enrollments_diretor_select ON public.enrollments;
CREATE POLICY enrollments_diretor_select
ON public.enrollments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'diretor'::app_role) AND public.is_director_of(seller_id));

DROP POLICY IF EXISTS enrollments_diretor_insert ON public.enrollments;
CREATE POLICY enrollments_diretor_insert
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'diretor'::app_role) AND public.is_director_of(seller_id));

DROP POLICY IF EXISTS enrollments_diretor_update ON public.enrollments;
CREATE POLICY enrollments_diretor_update
ON public.enrollments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'diretor'::app_role) AND public.is_director_of(seller_id))
WITH CHECK (has_role(auth.uid(), 'diretor'::app_role) AND public.is_director_of(seller_id));

DROP POLICY IF EXISTS enrollments_diretor_delete ON public.enrollments;
CREATE POLICY enrollments_diretor_delete
ON public.enrollments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'diretor'::app_role) AND public.is_director_of(seller_id));