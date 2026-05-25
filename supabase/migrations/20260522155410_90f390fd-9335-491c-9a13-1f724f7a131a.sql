
ALTER VIEW public.weekly_seller_stats SET (security_invoker = on);

REVOKE EXECUTE ON FUNCTION public.current_seller_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_seller_id() TO authenticated;
