import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna a lista de seller_ids que o usuário atual pode acessar.
 *  - staff (admin/diretor/ceo/presidente) → null (sem filtro, vê tudo)
 *  - gestor (franqueado ou diretor-like via team_seller_links/director_id) → ids da equipe
 *  - vendedor → apenas o próprio seller_id (ou [] se não tiver vínculo)
 *  - sem papel/login → []
 */
export async function getAccessibleSellerIds(): Promise<string[] | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid);
  const roles = (rolesData ?? []).map((r) => r.role as string);

  const isStaff = roles.some((r) =>
    ["admin", "diretor", "ceo", "presidente"].includes(r),
  );
  if (isStaff) return null;

  const isFranchisee = roles.includes("franqueado");
  const isSeller = roles.includes("vendedor") || isFranchisee;

  // Gestor (franqueado) — pode ter equipe via team_seller_links/director_id
  if (isFranchisee) {
    const [linksRes, ownedRes, selfRes] = await Promise.all([
      supabase
        .from("team_seller_links")
        .select("seller_id")
        .eq("manager_user_id", uid)
        .eq("active", true),
      supabase.from("sellers").select("id").eq("director_id", uid),
      supabase.from("sellers").select("id").eq("user_id", uid).maybeSingle(),
    ]);
    const ids = new Set<string>();
    (linksRes.data ?? []).forEach((r) => ids.add(r.seller_id));
    (ownedRes.data ?? []).forEach((r) => ids.add(r.id));
    if (selfRes.data?.id) ids.add(selfRes.data.id);
    return Array.from(ids);
  }

  if (isSeller) {
    const { data } = await supabase
      .from("sellers")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    return data?.id ? [data.id] : [];
  }

  return [];
}
