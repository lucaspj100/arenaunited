
REVOKE EXECUTE ON FUNCTION public.enforce_seller_update_scope() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
