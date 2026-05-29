import type { Enrollment } from "./enrollments";
import type { FinancialSettings, SellerFinancialSettings } from "./financialSettings";

/** Comissão efetiva (snapshot da matrícula tem prioridade). */
export function commissionOf(e: Enrollment): number {
  if (e.commissionAmount && e.commissionAmount > 0) return e.commissionAmount;
  return round2(e.enrollmentValue * (e.commissionRate ?? 0));
}

/** Taxa fixa de matrícula deduzida da receita líquida (regras globais). */
export function enrollmentFeeOf(
  e: Enrollment,
  s: FinancialSettings,
): number {
  if (s.defaultEnrollmentFeeType === "percent") {
    return round2(e.enrollmentValue * s.defaultEnrollmentFeeValue);
  }
  return round2(s.defaultEnrollmentFeeValue);
}

export function netEnrollment(e: Enrollment, s: FinancialSettings): number {
  return round2(e.enrollmentValue - commissionOf(e) - enrollmentFeeOf(e, s));
}

export function ltv(e: Enrollment, s: FinancialSettings): number {
  return round2(e.monthlyFee * s.averageLifetimeMonths);
}

export function ltvAdjusted(e: Enrollment, s: FinancialSettings): number {
  return round2(ltv(e, s) * (1 - s.cancellationRate));
}

export function expectedRevenue(e: Enrollment, s: FinancialSettings): number {
  return round2(netEnrollment(e, s) + ltvAdjusted(e, s));
}

export type FinancialScopeKpis = {
  enrollmentsApproved: number;
  grossEnrollmentRevenue: number;
  netEnrollmentRevenue: number;
  newMRR: number;
  totalLTV: number;
  totalLTVAdjusted: number;
  totalCommission: number;
  totalExpectedRevenue: number;
  vgvTotal: number;

  salariesTotal: number;
  generalToolsCost: number;
  paidTrafficCost: number;
  otherCommercialCosts: number;
  individualCostsTotal: number;
  totalInvestment: number;

  cac: number | null; // null se não há matrículas
  roi: number | null; // null se totalInvestment == 0
};

/**
 * Calcula todos os KPIs financeiros para um conjunto de matrículas aprovadas.
 * `sellerCosts` deve incluir os custos individuais dos vendedores no escopo.
 */
export function computeScopeKpis(
  enrollments: Enrollment[],
  settings: FinancialSettings,
  sellerCosts: SellerFinancialSettings[],
  options?: { includeGeneralCosts?: boolean },
): FinancialScopeKpis {
  const includeGeneral = options?.includeGeneralCosts ?? true;
  let gross = 0,
    net = 0,
    mrr = 0,
    ltvSum = 0,
    ltvAdj = 0,
    commission = 0,
    expected = 0,
    vgv = 0;

  for (const e of enrollments) {
    gross += e.enrollmentValue;
    net += netEnrollment(e, settings);
    mrr += e.monthlyFee;
    ltvSum += ltv(e, settings);
    ltvAdj += ltvAdjusted(e, settings);
    commission += commissionOf(e);
    expected += expectedRevenue(e, settings);
    vgv += e.enrollmentValue + e.monthlyFee * settings.contractDurationMonths;
  }

  const salariesTotal = sellerCosts.reduce(
    (acc, s) => acc + (s.activeForFinancialAnalysis ? s.monthlySalary : 0),
    0,
  );
  const individualCostsTotal = sellerCosts.reduce(
    (acc, s) =>
      acc +
      (s.activeForFinancialAnalysis
        ? s.monthlySalary + s.monthlyToolsCost + s.otherIndividualCosts
        : 0),
    0,
  );

  const generalToolsCost = includeGeneral ? settings.generalToolsCost : 0;
  const paidTrafficCost = includeGeneral ? settings.paidTrafficCost : 0;
  const otherCommercialCosts = includeGeneral ? settings.otherCommercialCosts : 0;

  const totalInvestment =
    generalToolsCost +
    paidTrafficCost +
    otherCommercialCosts +
    individualCostsTotal;

  return {
    enrollmentsApproved: enrollments.length,
    grossEnrollmentRevenue: round2(gross),
    netEnrollmentRevenue: round2(net),
    newMRR: round2(mrr),
    totalLTV: round2(ltvSum),
    totalLTVAdjusted: round2(ltvAdj),
    totalCommission: round2(commission),
    totalExpectedRevenue: round2(expected),
    vgvTotal: round2(vgv),
    salariesTotal: round2(salariesTotal),
    generalToolsCost: round2(generalToolsCost),
    paidTrafficCost: round2(paidTrafficCost),
    otherCommercialCosts: round2(otherCommercialCosts),
    individualCostsTotal: round2(individualCostsTotal),
    totalInvestment: round2(totalInvestment),
    cac:
      enrollments.length > 0 ? round2(totalInvestment / enrollments.length) : null,
    roi: totalInvestment > 0 ? round2(expected / totalInvestment) : null,
  };
}

/** Agrupa matrículas por vendedor. */
export function groupBySeller<T extends { sellerId: string }>(
  items: T[],
): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const arr = m.get(it.sellerId) ?? [];
    arr.push(it);
    m.set(it.sellerId, arr);
  }
  return m;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
