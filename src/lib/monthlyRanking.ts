import { supabase } from "@/integrations/supabase/client";
import type { Seller } from "./ranking";
import { fetchSellers } from "./storage";

export function currentMonthYear(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Carrega vendedores com totais de matrículas e material APENAS do mês informado
 * (default: mês vigente). Mantém scheduled/completed do mês (que já é mensal na view).
 */
export async function fetchMonthlySellers(
  year?: number,
  month?: number,
): Promise<Seller[]> {
  const ref = year && month ? { year, month } : currentMonthYear();
  const [sellers, monthlyRes] = await Promise.all([
    fetchSellers(),
    supabase
      .from("seller_monthly_approved_totals")
      .select("seller_id,approved_deals,approved_material_value")
      .eq("year", ref.year)
      .eq("month", ref.month),
  ]);
  if (monthlyRes.error) console.warn("seller_monthly_approved_totals", monthlyRes.error);
  const map = new Map<string, { d: number; m: number }>();
  for (const r of monthlyRes.data ?? []) {
    map.set(r.seller_id as string, {
      d: Number(r.approved_deals) || 0,
      m: Number(r.approved_material_value) || 0,
    });
  }
  return sellers.map((s) => {
    const t = map.get(s.id);
    return { ...s, deals: t?.d ?? 0, material: t?.m ?? 0 };
  });
}

export type RankingSnapshot = {
  id: string;
  sellerId: string;
  sellerName: string;
  role: "consultor" | "gerente";
  year: number;
  month: number;
  finalPosition: number;
  totalScheduled: number;
  totalCompleted: number;
  totalEnrollments: number;
  totalMaterial: number;
  conversionRate: number;
  totalScore: number;
  closedAt: string;
};

export async function fetchRankingHistory(filters: {
  year: number;
  month: number;
  sellerId?: string;
  role?: "consultor" | "gerente";
}): Promise<RankingSnapshot[]> {
  let q = supabase
    .from("monthly_ranking_snapshots")
    .select(
      "id,seller_id,seller_name,role_snapshot,year,month,final_position,total_scheduled,total_completed,total_enrollments,total_material,conversion_rate,total_score,closed_at",
    )
    .eq("year", filters.year)
    .eq("month", filters.month)
    .order("final_position", { ascending: true });
  if (filters.sellerId) q = q.eq("seller_id", filters.sellerId);
  if (filters.role) q = q.eq("role_snapshot", filters.role);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    sellerId: r.seller_id as string,
    sellerName: r.seller_name as string,
    role: r.role_snapshot as "consultor" | "gerente",
    year: Number(r.year),
    month: Number(r.month),
    finalPosition: Number(r.final_position),
    totalScheduled: Number(r.total_scheduled) || 0,
    totalCompleted: Number(r.total_completed) || 0,
    totalEnrollments: Number(r.total_enrollments) || 0,
    totalMaterial: Number(r.total_material) || 0,
    conversionRate: Number(r.conversion_rate) || 0,
    totalScore: Number(r.total_score) || 0,
    closedAt: r.closed_at as string,
  }));
}

/** Lista (ano, mês) que já têm snapshots — útil para o seletor do histórico. */
export async function fetchAvailableMonths(): Promise<
  { year: number; month: number }[]
> {
  const { data, error } = await supabase
    .from("monthly_ranking_snapshots")
    .select("year,month")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  const out: { year: number; month: number }[] = [];
  for (const r of data ?? []) {
    const k = `${r.year}-${r.month}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ year: Number(r.year), month: Number(r.month) });
  }
  return out;
}

/** Reprocessa o snapshot de um mês específico (admin). */
export async function closeMonthlyRanking(year: number, month: number) {
  const { data, error } = await supabase.rpc("close_monthly_ranking", {
    p_year: year,
    p_month: month,
  });
  if (error) throw error;
  return Number(data) || 0;
}

export const MONTH_LABELS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];