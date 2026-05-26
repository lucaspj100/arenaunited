import type { SellerRole } from "./commissions";

export type Seller = {
  id: string;
  name: string;
  avatar?: string | null;
  deals: number;
  material: number;
  goalDeals: number;
  goalMaterial: number;
  sortIndex?: number;
  weekScheduled: number;
  weekCompleted: number;
  weekEnrollments: number;
  userId?: string | null;
  role: SellerRole;
  inMyTeam?: boolean;
  commissionRate?: number | null;
  directorId?: string | null;
};

export const MIN_WEEK_INTERVIEWS_FOR_CONVERSION = 3;

export function conversionRate(s: Pick<Seller, "weekCompleted" | "weekEnrollments">) {
  if (!s.weekCompleted) return 0;
  return Math.round((s.weekEnrollments / s.weekCompleted) * 1000) / 10;
}

export function rankBy<T extends Seller>(sellers: T[], key: (s: T) => number, filter?: (s: T) => boolean) {
  return sellers
    .filter((s) => (filter ? filter(s) : true))
    .map((s) => ({ ...s, metric: key(s) }))
    .sort((a, b) => b.metric - a.metric);
}

export type Weights = {
  deals: number;
  material: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  deals: 50,
  material: 50,
};

export type Goals = {
  deals: number;
  material: number;
};

export const DEFAULT_GOALS: Goals = {
  deals: 20,
  material: 30000,
};

function pct(val: number, goal: number) {
  if (!goal) return 0;
  return Math.min((val / goal) * 100, 150);
}

export function scoreSeller(s: Seller, w: Weights) {
  const totalW = w.deals + w.material || 1;
  const score =
    (pct(s.deals, s.goalDeals) * w.deals +
      pct(s.material, s.goalMaterial) * w.material) /
    totalW;
  return Math.round(score * 10) / 10;
}

export function rankSellers(sellers: Seller[], w: Weights) {
  return [...sellers]
    .map((s) => ({ ...s, score: scoreSeller(s, w) }))
    .sort((a, b) => b.score - a.score);
}

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
