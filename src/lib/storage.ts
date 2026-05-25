import { supabase } from "@/integrations/supabase/client";
import { Seller, Weights, DEFAULT_WEIGHTS } from "./ranking";

const LOCAL_KEY = "arena-fanaticos-config-v1";

export type LocalConfig = {
  weights: Weights;
  period: string;
};

export function loadLocalConfig(): LocalConfig {
  if (typeof window === "undefined") return { weights: DEFAULT_WEIGHTS, period: "Mês atual" };
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { weights: DEFAULT_WEIGHTS, period: "Mês atual" };
    return JSON.parse(raw);
  } catch {
    return { weights: DEFAULT_WEIGHTS, period: "Mês atual" };
  }
}

export function saveLocalConfig(c: LocalConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(c));
}

type Row = {
  id: string;
  name: string;
  avatar: string | null;
  deals: number;
  material: number | string;
  goal_deals: number;
  goal_material: number | string;
  sort_index: number;
  week_scheduled: number | null;
  week_completed: number | null;
  week_enrollments: number | null;
  user_id: string | null;
  role: "consultor" | "gerente" | null;
};

const COLS =
  "id,name,avatar,deals,material,goal_deals,goal_material,sort_index,week_scheduled,week_completed,week_enrollments,user_id,role";

const toSeller = (r: Row): Seller => ({
  id: r.id,
  name: r.name,
  avatar: r.avatar ?? undefined,
  deals: r.deals,
  material: Number(r.material),
  goalDeals: r.goal_deals,
  goalMaterial: Number(r.goal_material),
  sortIndex: r.sort_index,
  weekScheduled: r.week_scheduled ?? 0,
  weekCompleted: r.week_completed ?? 0,
  weekEnrollments: r.week_enrollments ?? 0,
  userId: r.user_id,
  role: (r.role ?? "consultor") as Seller["role"],
});

export async function fetchSellers(): Promise<Seller[]> {
  const [sellersRes, statsRes] = await Promise.all([
    supabase
      .from("sellers")
      .select(COLS)
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("weekly_seller_stats")
      .select("seller_id,week_scheduled,week_completed,week_enrollments"),
  ]);
  if (sellersRes.error) throw sellersRes.error;
  if (statsRes.error) console.warn("weekly_seller_stats error", statsRes.error);
  const statsMap = new Map<string, { s: number; c: number; e: number }>();
  for (const r of statsRes.data ?? []) {
    statsMap.set(r.seller_id as string, {
      s: Number(r.week_scheduled) || 0,
      c: Number(r.week_completed) || 0,
      e: Number(r.week_enrollments) || 0,
    });
  }
  return (sellersRes.data as Row[]).map((r) => {
    const base = toSeller(r);
    const st = statsMap.get(base.id);
    if (st) {
      base.weekScheduled = st.s;
      base.weekCompleted = st.c;
      base.weekEnrollments = st.e;
    }
    return base;
  });
}


export async function insertSeller(s: Omit<Seller, "id">): Promise<Seller> {
  const { data, error } = await supabase
    .from("sellers")
    .insert({
      name: s.name,
      avatar: s.avatar ?? null,
      deals: s.deals,
      material: s.material,
      goal_deals: s.goalDeals,
      goal_material: s.goalMaterial,
      sort_index: s.sortIndex ?? 0,
      week_scheduled: s.weekScheduled,
      week_completed: s.weekCompleted,
      week_enrollments: s.weekEnrollments,
      user_id: s.userId ?? null,
      role: s.role,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return toSeller(data as Row);
}

export async function updateSeller(id: string, patch: Partial<Seller>): Promise<void> {
  const row: {
    name?: string;
    avatar?: string | null;
    deals?: number;
    material?: number;
    goal_deals?: number;
    goal_material?: number;
    sort_index?: number;
    week_scheduled?: number;
    week_completed?: number;
    week_enrollments?: number;
    user_id?: string | null;
    role?: "consultor" | "gerente";
  } = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.avatar !== undefined) row.avatar = patch.avatar ?? null;
  if (patch.deals !== undefined) row.deals = patch.deals;
  if (patch.material !== undefined) row.material = patch.material;
  if (patch.goalDeals !== undefined) row.goal_deals = patch.goalDeals;
  if (patch.goalMaterial !== undefined) row.goal_material = patch.goalMaterial;
  if (patch.sortIndex !== undefined) row.sort_index = patch.sortIndex;
  if (patch.weekScheduled !== undefined) row.week_scheduled = patch.weekScheduled;
  if (patch.weekCompleted !== undefined) row.week_completed = patch.weekCompleted;
  if (patch.weekEnrollments !== undefined) row.week_enrollments = patch.weekEnrollments;
  if (patch.userId !== undefined) row.user_id = patch.userId ?? null;
  if (patch.role !== undefined) row.role = patch.role;
  const { error } = await supabase.from("sellers").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteSellerRow(id: string): Promise<void> {
  const { error } = await supabase.from("sellers").delete().eq("id", id);
  if (error) throw error;
}
