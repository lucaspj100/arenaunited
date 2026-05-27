CREATE OR REPLACE VIEW public.seller_approved_totals
WITH (security_invoker=on) AS
SELECT
  seller_id,
  COUNT(*)::int AS approved_deals,
  COALESCE(SUM(enrollment_value), 0)::numeric AS approved_enrollment_value,
  COALESCE(SUM(material_value), 0)::numeric AS approved_material_value
FROM public.enrollments
WHERE status = 'approved'
GROUP BY seller_id;

GRANT SELECT ON public.seller_approved_totals TO authenticated;
GRANT SELECT ON public.seller_approved_totals TO service_role;