export type SellerRole = "consultor" | "gerente";

export const ROLE_LABELS: Record<SellerRole, string> = {
  consultor: "Consultor",
  gerente: "Gerente",
};

export const COMMISSION_RATE: Record<SellerRole, number> = {
  consultor: 0.3,
  gerente: 0.53,
};

export type MaterialTier = { min: number; award: number };

export const MATERIAL_TIERS: Record<SellerRole, MaterialTier[]> = {
  consultor: [
    { min: 7000, award: 800 },
    { min: 15000, award: 1500 },
  ],
  gerente: [
    { min: 12000, award: 1000 },
    { min: 15000, award: 1500 },
  ],
};

export type MaterialProgress = {
  award: number;
  nextTier: MaterialTier | null;
  nextMin: number;
  missing: number;
  reachedMax: boolean;
  progressPct: number;
  message: string;
};

export function computeMaterialAward(role: SellerRole, total: number): MaterialProgress {
  const tiers = MATERIAL_TIERS[role];
  let award = 0;
  for (const t of tiers) if (total >= t.min) award = Math.max(award, t.award);

  const nextTier = tiers.find((t) => total < t.min) ?? null;
  const reachedMax = !nextTier;
  const nextMin = nextTier ? nextTier.min : tiers[tiers.length - 1].min;
  const missing = nextTier ? Math.max(0, nextTier.min - total) : 0;
  const progressPct = Math.min(100, Math.round((total / nextMin) * 100));

  let message: string;
  if (reachedMax) {
    message = `Parabéns! Você atingiu a maior premiação de material: ${formatBRL(award)}.`;
  } else if (award === 0) {
    message = `Faltam ${formatBRL(missing)} em material para você atingir a premiação de ${formatBRL(nextTier!.award)}.`;
  } else {
    message = `Você já atingiu ${formatBRL(award)} de premiação. Faltam ${formatBRL(missing)} em material para chegar à premiação de ${formatBRL(nextTier!.award)}.`;
  }

  return { award, nextTier, nextMin, missing, reachedMax, progressPct, message };
}

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

// =========== Períodos ===========
export type PeriodKey = "today" | "week" | "month" | "lastMonth" | "custom";

export type PeriodRange = { from: string; to: string; label: string };

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getPeriodRange(key: PeriodKey, custom?: { from: string; to: string }): PeriodRange {
  const now = new Date();
  if (key === "today") {
    const s = iso(now);
    return { from: s, to: s, label: "Hoje" };
  }
  if (key === "week") {
    const d = new Date(now);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: iso(monday), to: iso(sunday), label: "Esta semana" };
  }
  if (key === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: iso(first), to: iso(last), label: "Este mês" };
  }
  if (key === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(first), to: iso(last), label: "Mês anterior" };
  }
  return {
    from: custom?.from ?? iso(now),
    to: custom?.to ?? iso(now),
    label: "Personalizado",
  };
}

// Período imediatamente anterior, com mesma duração em dias
export function getPreviousRange(range: PeriodRange): PeriodRange {
  const from = new Date(range.from + "T00:00:00");
  const to = new Date(range.to + "T00:00:00");
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: iso(prevFrom), to: iso(prevTo), label: "Período anterior" };
}
