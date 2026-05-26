
-- 1) Enum de status
DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Colunas em enrollments
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS status public.enrollment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Matrículas existentes ficam aprovadas (não quebra o ranking atual)
UPDATE public.enrollments SET status = 'approved'::public.enrollment_status WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

-- 3) Trigger: define status no INSERT conforme quem cria
CREATE OR REPLACE FUNCTION public.enforce_enrollment_status_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_staff(v_uid) OR public.is_director_of(NEW.seller_id) THEN
    -- Staff cria já aprovada (a menos que explicitamente venha como pending/rejected)
    IF NEW.status IS NULL OR NEW.status = 'pending' THEN
      NEW.status := 'approved'::public.enrollment_status;
    END IF;
    IF NEW.status = 'approved' THEN
      NEW.approved_by := v_uid;
      NEW.approved_at := now();
    END IF;
  ELSE
    -- Vendedor: sempre pendente
    NEW.status := 'pending'::public.enrollment_status;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_status_insert ON public.enrollments;
CREATE TRIGGER enrollments_status_insert
BEFORE INSERT ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.enforce_enrollment_status_insert();

-- 4) Trigger: protege status no UPDATE
CREATE OR REPLACE FUNCTION public.enforce_enrollment_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_can_approve boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_can_approve := public.is_staff(v_uid) OR public.is_director_of(NEW.seller_id);

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT v_can_approve THEN
      RAISE EXCEPTION 'Apenas diretor da equipe ou administrador podem aprovar/recusar matrículas.';
    END IF;
    IF NEW.status = 'approved' THEN
      NEW.approved_by := v_uid;
      NEW.approved_at := now();
      NEW.rejection_reason := NULL;
    ELSIF NEW.status = 'rejected' THEN
      NEW.approved_by := v_uid;
      NEW.approved_at := now();
    ELSE
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
      NEW.rejection_reason := NULL;
    END IF;
  ELSE
    -- Vendedor não pode mexer nos campos administrativos
    IF NOT v_can_approve THEN
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
      NEW.rejection_reason := OLD.rejection_reason;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_status_update ON public.enrollments;
CREATE TRIGGER enrollments_status_update
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.enforce_enrollment_status_update();
