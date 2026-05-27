CREATE OR REPLACE VIEW public.latest_approved_enrollment
WITH (security_invoker = off) AS
SELECT
  e.id,
  e.student_name,
  e.enrollment_value,
  e.material_value,
  e.monthly_fee,
  e.commission_amount,
  e.enrollment_date,
  e.approved_at,
  e.created_at,
  s.id AS seller_id,
  s.name AS seller_name,
  s.avatar AS seller_avatar,
  s.role AS seller_role
FROM public.enrollments e
JOIN public.sellers s ON s.id = e.seller_id
WHERE e.status = 'approved'
ORDER BY COALESCE(e.approved_at, e.created_at) DESC
LIMIT 1;

GRANT SELECT ON public.latest_approved_enrollment TO authenticated;
GRANT SELECT ON public.latest_approved_enrollment TO anon;