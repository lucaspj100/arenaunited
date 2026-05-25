ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS week_scheduled integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_enrollments integer NOT NULL DEFAULT 0;