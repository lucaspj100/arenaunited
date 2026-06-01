
-- ============ Snapshot table ============
CREATE TABLE public.monthly_ranking_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  seller_name text NOT NULL,
  role_snapshot public.seller_role NOT NULL,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  final_position int NOT NULL,
  total_scheduled int NOT NULL DEFAULT 0,
  total_completed int NOT NULL DEFAULT 0,
  total_enrollments int NOT NULL DEFAULT 0,
  total_material numeric NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 0,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, year, month)
);

GRANT SELECT ON public.monthly_ranking_snapshots TO authenticated;
GRANT ALL ON public.monthly_ranking_snapshots TO service_role;

ALTER TABLE public.monthly_ranking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY mrs_staff_all ON public.monthly_ranking_snapshots
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY mrs_manager_select ON public.monthly_ranking_snapshots
  FOR SELECT TO authenticated
  USING (public.manages_seller(auth.uid(), seller_id));

CREATE POLICY mrs_seller_self_select ON public.monthly_ranking_snapshots
  FOR SELECT TO authenticated
  USING (seller_id = public.current_seller_id());

CREATE INDEX idx_mrs_year_month ON public.monthly_ranking_snapshots(year, month);
CREATE INDEX idx_mrs_seller ON public.monthly_ranking_snapshots(seller_id);

-- ============ Monthly approved totals view ============
CREATE OR REPLACE VIEW public.seller_monthly_approved_totals AS
SELECT
  e.seller_id,
  EXTRACT(YEAR FROM e.enrollment_date)::int AS year,
  EXTRACT(MONTH FROM e.enrollment_date)::int AS month,
  COUNT(*)::int AS approved_deals,
  COALESCE(SUM(e.material_value), 0)::numeric AS approved_material_value
FROM public.enrollments e
WHERE e.status = 'approved'
GROUP BY e.seller_id, EXTRACT(YEAR FROM e.enrollment_date), EXTRACT(MONTH FROM e.enrollment_date);

GRANT SELECT ON public.seller_monthly_approved_totals TO authenticated;

-- ============ Close month function ============
CREATE OR REPLACE FUNCTION public.close_monthly_ranking(p_year int, p_month int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date := make_date(p_year, p_month, 1);
  v_end date := (v_start + interval '1 month')::date;
  v_count int;
BEGIN
  WITH enroll AS (
    SELECT seller_id,
           COUNT(*) FILTER (WHERE status='approved')::int AS deals,
           COALESCE(SUM(material_value) FILTER (WHERE status='approved'), 0)::numeric AS material
    FROM public.enrollments
    WHERE enrollment_date >= v_start AND enrollment_date < v_end
    GROUP BY seller_id
  ),
  intv AS (
    SELECT seller_id,
           COUNT(*)::int AS scheduled,
           COUNT(*) FILTER (WHERE status IN ('realizada','fechada'))::int AS completed
    FROM public.interviews
    WHERE scheduled_date >= v_start AND scheduled_date < v_end
    GROUP BY seller_id
  ),
  combined AS (
    SELECT s.id AS seller_id, s.name, s.role,
           COALESCE(e.deals,0) AS deals,
           COALESCE(e.material,0) AS material,
           COALESCE(i.scheduled,0) AS scheduled,
           COALESCE(i.completed,0) AS completed,
           s.goal_deals, s.goal_material
    FROM public.sellers s
    LEFT JOIN enroll e ON e.seller_id = s.id
    LEFT JOIN intv i ON i.seller_id = s.id
    WHERE COALESCE(e.deals,0) > 0 OR COALESCE(e.material,0) > 0
       OR COALESCE(i.scheduled,0) > 0 OR COALESCE(i.completed,0) > 0
  ),
  ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY deals DESC, material DESC, completed DESC) AS pos,
      CASE WHEN completed > 0 THEN ROUND((deals::numeric / completed) * 100, 2) ELSE 0 END AS conv,
      ROUND((
        LEAST(CASE WHEN goal_deals>0 THEN deals::numeric/goal_deals*100 ELSE 0 END, 150::numeric) +
        LEAST(CASE WHEN goal_material>0 THEN material/goal_material*100 ELSE 0 END, 150::numeric)
      ) / 2, 1) AS score
    FROM combined
  )
  INSERT INTO public.monthly_ranking_snapshots
    (seller_id, seller_name, role_snapshot, year, month,
     final_position, total_scheduled, total_completed, total_enrollments,
     total_material, conversion_rate, total_score)
  SELECT seller_id, name, role, p_year, p_month,
         pos::int, scheduled, completed, deals, material, conv, score
  FROM ranked
  ON CONFLICT (seller_id, year, month) DO UPDATE SET
    seller_name = EXCLUDED.seller_name,
    role_snapshot = EXCLUDED.role_snapshot,
    final_position = EXCLUDED.final_position,
    total_scheduled = EXCLUDED.total_scheduled,
    total_completed = EXCLUDED.total_completed,
    total_enrollments = EXCLUDED.total_enrollments,
    total_material = EXCLUDED.total_material,
    conversion_rate = EXCLUDED.conversion_rate,
    total_score = EXCLUDED.total_score,
    closed_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_monthly_ranking(int, int) TO authenticated;

-- ============ Auto-close previous month (cron entrypoint) ============
CREATE OR REPLACE FUNCTION public.close_previous_month_ranking()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev date := (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')) - interval '1 month')::date;
BEGIN
  RETURN public.close_monthly_ranking(EXTRACT(YEAR FROM v_prev)::int, EXTRACT(MONTH FROM v_prev)::int);
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_previous_month_ranking() TO authenticated;

-- ============ Backfill all past months ============
DO $$
DECLARE
  r record;
  v_current_start date := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
  FOR r IN
    SELECT DISTINCT
      EXTRACT(YEAR FROM d)::int AS y,
      EXTRACT(MONTH FROM d)::int AS m
    FROM (
      SELECT enrollment_date AS d FROM public.enrollments WHERE status='approved'
      UNION ALL
      SELECT scheduled_date AS d FROM public.interviews
    ) sub
    WHERE d < v_current_start
    ORDER BY 1, 2
  LOOP
    PERFORM public.close_monthly_ranking(r.y, r.m);
  END LOOP;
END;
$$;
