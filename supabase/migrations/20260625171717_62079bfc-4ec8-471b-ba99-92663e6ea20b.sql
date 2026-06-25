
-- 1. crm_arena_seller_links
CREATE TABLE public.crm_arena_seller_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_user_id uuid NOT NULL,
  arena_seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_arena_seller_links TO authenticated;
GRANT ALL ON public.crm_arena_seller_links TO service_role;

ALTER TABLE public.crm_arena_seller_links ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX crm_arena_seller_links_active_user
  ON public.crm_arena_seller_links(crm_user_id) WHERE active;

CREATE INDEX crm_arena_seller_links_seller ON public.crm_arena_seller_links(arena_seller_id);

CREATE POLICY "Staff can view crm links" ON public.crm_arena_seller_links
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert crm links" ON public.crm_arena_seller_links
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update crm links" ON public.crm_arena_seller_links
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete crm links" ON public.crm_arena_seller_links
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER touch_crm_arena_seller_links
  BEFORE UPDATE ON public.crm_arena_seller_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. crm_integration_events
CREATE TABLE public.crm_integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  crm_lead_id text,
  crm_user_id uuid,
  arena_seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','ignored','error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT SELECT ON public.crm_integration_events TO authenticated;
GRANT ALL ON public.crm_integration_events TO service_role;

ALTER TABLE public.crm_integration_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX crm_integration_events_created ON public.crm_integration_events(created_at DESC);
CREATE INDEX crm_integration_events_lead ON public.crm_integration_events(crm_lead_id);
CREATE INDEX crm_integration_events_type ON public.crm_integration_events(event_type);
CREATE INDEX crm_integration_events_status ON public.crm_integration_events(status);

CREATE POLICY "Staff can view crm events" ON public.crm_integration_events
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- 3. crm_lead_id em interviews e enrollments
ALTER TABLE public.interviews ADD COLUMN crm_lead_id text;
ALTER TABLE public.enrollments ADD COLUMN crm_lead_id text;

CREATE UNIQUE INDEX interviews_seller_crm_lead
  ON public.interviews(seller_id, crm_lead_id) WHERE crm_lead_id IS NOT NULL;
CREATE UNIQUE INDEX enrollments_seller_crm_lead
  ON public.enrollments(seller_id, crm_lead_id) WHERE crm_lead_id IS NOT NULL;
