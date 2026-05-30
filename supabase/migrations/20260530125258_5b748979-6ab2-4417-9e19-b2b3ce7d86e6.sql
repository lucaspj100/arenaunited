ALTER TABLE public.team_financial_settings
  ADD COLUMN IF NOT EXISTS headquarters_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consultant_commission_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manager_commission_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_fee_percentage numeric NOT NULL DEFAULT 0;