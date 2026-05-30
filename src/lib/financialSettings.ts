import { supabase } from "@/integrations/supabase/client";

// =========================== Globais (rede) ===========================
export type FinancialSettings = {
  id: string;
  averageLifetimeMonths: number;
  contractDurationMonths: number;
  cancellationRate: number;
  generalToolsCost: number;
  paidTrafficCost: number;
  otherCommercialCosts: number;
  defaultEnrollmentFeeType: "fixed" | "percent";
  defaultEnrollmentFeeValue: number;
  defaultSchoolRetentionPercentage: number;
};

const DEFAULT_SETTINGS: FinancialSettings = {
  id: "",
  averageLifetimeMonths: 8,
  contractDurationMonths: 18,
  cancellationRate: 0.1,
  generalToolsCost: 0,
  paidTrafficCost: 0,
  otherCommercialCosts: 0,
  defaultEnrollmentFeeType: "fixed",
  defaultEnrollmentFeeValue: 0,
  defaultSchoolRetentionPercentage: 0,
};

export async function fetchFinancialSettings(): Promise<FinancialSettings> {
  const { data, error } = await supabase
    .from("financial_settings")
    .select(
      "id,average_lifetime_months,contract_duration_months,cancellation_rate,general_tools_cost,paid_traffic_cost,other_commercial_costs,default_enrollment_fee_type,default_enrollment_fee_value,default_school_retention_percentage",
    )
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...DEFAULT_SETTINGS };
  return {
    id: data.id,
    averageLifetimeMonths: Number(data.average_lifetime_months),
    contractDurationMonths: Number(data.contract_duration_months),
    cancellationRate: Number(data.cancellation_rate),
    generalToolsCost: Number(data.general_tools_cost),
    paidTrafficCost: Number(data.paid_traffic_cost),
    otherCommercialCosts: Number(data.other_commercial_costs),
    defaultEnrollmentFeeType: data.default_enrollment_fee_type as "fixed" | "percent",
    defaultEnrollmentFeeValue: Number(data.default_enrollment_fee_value),
    defaultSchoolRetentionPercentage: Number(data.default_school_retention_percentage),
  };
}

export async function updateFinancialSettings(
  id: string,
  patch: Partial<FinancialSettings>,
): Promise<void> {
  const { error } = await supabase
    .from("financial_settings")
    .update({
      average_lifetime_months: patch.averageLifetimeMonths,
      contract_duration_months: patch.contractDurationMonths,
      cancellation_rate: patch.cancellationRate,
      general_tools_cost: patch.generalToolsCost,
      paid_traffic_cost: patch.paidTrafficCost,
      other_commercial_costs: patch.otherCommercialCosts,
      default_enrollment_fee_type: patch.defaultEnrollmentFeeType,
      default_enrollment_fee_value: patch.defaultEnrollmentFeeValue,
      default_school_retention_percentage: patch.defaultSchoolRetentionPercentage,
    })
    .eq("id", id);
  if (error) throw error;
}

// =========================== Por equipe / franquia ===========================
export type TeamFinancialSettings = {
  id: string;
  managerUserId: string;
  averageLifetimeMonths: number;
  contractDurationMonths: number;
  cancellationRate: number;
  enrollmentFeeType: "fixed" | "percent";
  enrollmentFeeValue: number;
  schoolRetentionPercentage: number;
  generalToolsCost: number;
  paidTrafficCost: number;
  otherCommercialCosts: number;
  headquartersPercentage: number;
  consultantCommissionPercentage: number;
  managerCommissionPercentage: number;
  cardFeePercentage: number;
};

export async function fetchTeamFinancialSettings(
  managerUserId: string,
): Promise<TeamFinancialSettings | null> {
  const { data, error } = await supabase
    .from("team_financial_settings")
    .select("*")
    .eq("manager_user_id", managerUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    managerUserId: data.manager_user_id,
    averageLifetimeMonths: Number(data.average_lifetime_months),
    contractDurationMonths: Number(data.contract_duration_months),
    cancellationRate: Number(data.cancellation_rate),
    enrollmentFeeType: data.enrollment_fee_type as "fixed" | "percent",
    enrollmentFeeValue: Number(data.enrollment_fee_value),
    schoolRetentionPercentage: Number(data.school_retention_percentage),
    generalToolsCost: Number(data.general_tools_cost),
    paidTrafficCost: Number(data.paid_traffic_cost),
    otherCommercialCosts: Number(data.other_commercial_costs),
    headquartersPercentage: Number(data.headquarters_percentage ?? 0),
    consultantCommissionPercentage: Number(data.consultant_commission_percentage ?? 0),
    managerCommissionPercentage: Number(data.manager_commission_percentage ?? 0),
    cardFeePercentage: Number(data.card_fee_percentage ?? 0),
  };
}

export async function upsertTeamFinancialSettings(
  managerUserId: string,
  patch: Partial<TeamFinancialSettings>,
): Promise<void> {
  const { error } = await supabase
    .from("team_financial_settings")
    .upsert(
      {
        manager_user_id: managerUserId,
        average_lifetime_months: patch.averageLifetimeMonths,
        contract_duration_months: patch.contractDurationMonths,
        cancellation_rate: patch.cancellationRate,
        enrollment_fee_type: patch.enrollmentFeeType,
        enrollment_fee_value: patch.enrollmentFeeValue,
        school_retention_percentage: patch.schoolRetentionPercentage,
        general_tools_cost: patch.generalToolsCost,
        paid_traffic_cost: patch.paidTrafficCost,
        other_commercial_costs: patch.otherCommercialCosts,
        headquarters_percentage: patch.headquartersPercentage,
        consultant_commission_percentage: patch.consultantCommissionPercentage,
        manager_commission_percentage: patch.managerCommissionPercentage,
        card_fee_percentage: patch.cardFeePercentage,
      },
      { onConflict: "manager_user_id" },
    );
  if (error) throw error;
}

/** Resolve as configurações a usar para um escopo (manager) com fallback global. */
export function mergeWithTeam(
  global: FinancialSettings,
  team: TeamFinancialSettings | null,
): FinancialSettings {
  if (!team) return global;
  return {
    ...global,
    averageLifetimeMonths: team.averageLifetimeMonths,
    contractDurationMonths: team.contractDurationMonths,
    cancellationRate: team.cancellationRate,
    generalToolsCost: team.generalToolsCost,
    paidTrafficCost: team.paidTrafficCost,
    otherCommercialCosts: team.otherCommercialCosts,
    defaultEnrollmentFeeType: team.enrollmentFeeType,
    defaultEnrollmentFeeValue: team.enrollmentFeeValue,
    defaultSchoolRetentionPercentage: team.schoolRetentionPercentage,
  };
}

// =========================== Por vendedor ===========================
export type SellerFinancialSettings = {
  sellerId: string;
  monthlySalary: number;
  monthlyToolsCost: number;
  otherIndividualCosts: number;
  financialNotes: string | null;
  activeForFinancialAnalysis: boolean;
};

export async function fetchSellerFinancialSettings(
  sellerIds?: string[],
): Promise<SellerFinancialSettings[]> {
  let q = supabase
    .from("seller_financial_settings")
    .select(
      "seller_id,monthly_salary,monthly_tools_cost,other_individual_costs,financial_notes,active_for_financial_analysis",
    );
  if (sellerIds && sellerIds.length > 0) q = q.in("seller_id", sellerIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    sellerId: r.seller_id,
    monthlySalary: Number(r.monthly_salary),
    monthlyToolsCost: Number(r.monthly_tools_cost),
    otherIndividualCosts: Number(r.other_individual_costs),
    financialNotes: r.financial_notes,
    activeForFinancialAnalysis: r.active_for_financial_analysis,
  }));
}

export async function upsertSellerFinancialSettings(
  s: SellerFinancialSettings,
  managerUserId?: string,
): Promise<void> {
  const { error } = await supabase
    .from("seller_financial_settings")
    .upsert(
      {
        seller_id: s.sellerId,
        monthly_salary: s.monthlySalary,
        monthly_tools_cost: s.monthlyToolsCost,
        other_individual_costs: s.otherIndividualCosts,
        financial_notes: s.financialNotes,
        active_for_financial_analysis: s.activeForFinancialAnalysis,
        manager_user_id: managerUserId,
      },
      { onConflict: "seller_id" },
    );
  if (error) throw error;
}
