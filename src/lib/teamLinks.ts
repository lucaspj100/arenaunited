import { supabase } from "@/integrations/supabase/client";

export type TeamLink = {
  id: string;
  managerUserId: string;
  sellerId: string;
  active: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  manager_user_id: string;
  seller_id: string;
  active: boolean;
  created_at: string;
};

const toLink = (r: Row): TeamLink => ({
  id: r.id,
  managerUserId: r.manager_user_id,
  sellerId: r.seller_id,
  active: r.active,
  createdAt: r.created_at,
});

export async function fetchActiveLinksForManager(
  managerUserId: string,
): Promise<TeamLink[]> {
  const { data, error } = await supabase
    .from("team_seller_links")
    .select("id,manager_user_id,seller_id,active,created_at")
    .eq("manager_user_id", managerUserId)
    .eq("active", true);
  if (error) throw error;
  return (data as Row[]).map(toLink);
}

export async function fetchAllActiveLinks(): Promise<TeamLink[]> {
  const { data, error } = await supabase
    .from("team_seller_links")
    .select("id,manager_user_id,seller_id,active,created_at")
    .eq("active", true);
  if (error) throw error;
  return (data as Row[]).map(toLink);
}

export async function fetchExistingLinkForSeller(
  sellerId: string,
): Promise<TeamLink | null> {
  const { data, error } = await supabase
    .from("team_seller_links")
    .select("id,manager_user_id,seller_id,active,created_at")
    .eq("seller_id", sellerId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toLink(data as Row) : null;
}

export async function addSellerToTeam(
  managerUserId: string,
  sellerId: string,
): Promise<TeamLink> {
  const { data, error } = await supabase
    .from("team_seller_links")
    .insert({
      manager_user_id: managerUserId,
      seller_id: sellerId,
      active: true,
      created_by: managerUserId,
      updated_by: managerUserId,
    })
    .select("id,manager_user_id,seller_id,active,created_at")
    .single();
  if (error) throw error;
  return toLink(data as Row);
}

export async function removeLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from("team_seller_links")
    .delete()
    .eq("id", linkId);
  if (error) throw error;
}

/** Desativa o vínculo ativo de um vendedor (staff override) */
export async function deactivateActiveLinkForSeller(
  sellerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("team_seller_links")
    .update({ active: false })
    .eq("seller_id", sellerId)
    .eq("active", true);
  if (error) throw error;
}
