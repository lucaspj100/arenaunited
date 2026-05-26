CREATE OR REPLACE VIEW public.monthly_seller_stats AS
SELECT s.id AS seller_id,
  COALESCE(SUM(CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END), 0)::integer AS month_scheduled,
  COALESCE(SUM(CASE WHEN i.status = ANY (ARRAY['realizada'::interview_status, 'fechada'::interview_status]) THEN 1 ELSE 0 END), 0)::integer AS month_completed,
  COALESCE(SUM(CASE WHEN i.status = 'fechada'::interview_status THEN 1 ELSE 0 END), 0)::integer AS month_enrollments
FROM sellers s
LEFT JOIN interviews i
  ON i.seller_id = s.id
  AND i.scheduled_date >= date_trunc('month', CURRENT_DATE)::date
  AND i.scheduled_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
GROUP BY s.id;

GRANT SELECT ON public.monthly_seller_stats TO authenticated;
GRANT SELECT ON public.monthly_seller_stats TO service_role;