
REVOKE EXECUTE ON FUNCTION public.enforce_seller_update_scope() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_interview_update_scope() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enrollments_apply_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
