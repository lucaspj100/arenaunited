import { supabase } from "@/integrations/supabase/client";

export type FinancialSettings = {
  id: string;
  averageLifetimeMonths: number;
  contractDurationMonths: number;
  cancellationRate: number;
  generalAutomationCost: number;
  generalToolsCost: number;
  paidTrafficCost: number;
  otherCommercialCosts: number;
  defaultEnrollmentFeeType: "fixed" | "percent";
  defaultEnrollmentFeeValue: number;
  defaultSchoolRetentionPercentage: number;
};

type GlobalRow = {
  id: string;
  average_lifetime_months: number;
  contract_duration_months: number;
  cancellation_rate: number | string;
  general_automation_cost: number | string;
  general_tools_cost: number | string;
  paid_traffic_cost: number | string;
  other_commercial_costs: number | string;
  default_enrollment_fee_type: "fixed" | "percent";
  default_enrollment_fee_value: number | string;
  default_school_retention_percentage: number | string;
};

const toGlobal = (r: GlobalRow): FinancialSettings => ({
  id: r.id,
  averageLifetimeMonths: Number(r.average_lifetime_months),
  contractDurationMonths: Number(r.contract_duration_months),
  cancellationRate: Number(r.cancellation_rate),
  generalAutomationCost: Number(r.general_automation_cost),
  generalToolsCost: Number(r.general_tools_cost),
  paidTrafficCost: Number(r.paid_traffic_cost),
  otherCommercialCosts: Number(r.other_commercial_costs),
  defaultEnrollmentFeeType: r.default_enrollment_fee_type,
  defaultEnrollmentFeeValue: Number(r.default_enrollment_fee_value),
  defaultSchoolRetentionPercentage: Number(r.default_school_retention_percentage),
});

export async function fetchFinancialSettings(): Promise<FinancialSettings> {
  const { data, error } = await supabase
    .from("financial_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Defaults fallback (caso a seed não tenha rodado)
    return {
      id: "",
      averageLifetimeMonths: 8,
      contractDurationMonths: 18,
      cancellationRate: 0.1,
      generalAutomationCost: 0,
      generalToolsCost: 0,
      paidTrafficCost: 0,
      otherCommercialCosts: 0,
      defaultEnrollmentFeeType: "fixed",
      defaultEnrollmentFeeValue: 0,
      defaultSchoolRetentionPercentage: 0,
    };
  }
  return toGlobal(data as GlobalRow);
}

export async function updateFinancialSettings(
  id: string,
  patch: Partial<FinancialSettings>,
): Promise<void> {
  const row: {
    average_lifetime_months?: number;
    contract_duration_months?: number;
    cancellation_rate?: number;
    general_automation_cost?: number;
    general_tools_cost?: number;
    paid_traffic_cost?: number;
    other_commercial_costs?: number;
    default_enrollment_fee_type?: "fixed" | "percent";
    default_enrollment_fee_value?: number;
    default_school_retention_percentage?: number;
  } = {};
  if (patch.averageLifetimeMonths !== undefined)
    row.average_lifetime_months = patch.averageLifetimeMonths;
  if (patch.contractDurationMonths !== undefined)
    row.contract_duration_months = patch.contractDurationMonths;
  if (patch.cancellationRate !== undefined)
    row.cancellation_rate = patch.cancellationRate;
  if (patch.generalAutomationCost !== undefined)
    row.general_automation_cost = patch.generalAutomationCost;
  if (patch.generalToolsCost !== undefined)
    row.general_tools_cost = patch.generalToolsCost;
  if (patch.paidTrafficCost !== undefined)
    row.paid_traffic_cost = patch.paidTrafficCost;
  if (patch.otherCommercialCosts !== undefined)
    row.other_commercial_costs = patch.otherCommercialCosts;
  if (patch.defaultEnrollmentFeeType !== undefined)
    row.default_enrollment_fee_type = patch.defaultEnrollmentFeeType;
  if (patch.defaultEnrollmentFeeValue !== undefined)
    row.default_enrollment_fee_value = patch.defaultEnrollmentFeeValue;
  if (patch.defaultSchoolRetentionPercentage !== undefined)
    row.default_school_retention_percentage = patch.defaultSchoolRetentionPercentage;
  const { error } = await supabase
    .from("financial_settings")
    .update(row)
    .eq("id", id);
  if (error) throw error;
}

// =========================== Por vendedor ===========================
export type SellerFinancialSettings = {
  sellerId: string;
  monthlyAutomationCost: number;
  monthlyToolsCost: number;
  financialNotes: string | null;
  activeForFinancialAnalysis: boolean;
};

type SellerRow = {
  seller_id: string;
  monthly_automation_cost: number | string;
  monthly_tools_cost: number | string;
  financial_notes: string | null;
  active_for_financial_analysis: boolean;
};

const toSeller = (r: SellerRow): SellerFinancialSettings => ({
  sellerId: r.seller_id,
  monthlyAutomationCost: Number(r.monthly_automation_cost),
  monthlyToolsCost: Number(r.monthly_tools_cost),
  financialNotes: r.financial_notes,
  activeForFinancialAnalysis: r.active_for_financial_analysis,
});

export async function fetchSellerFinancialSettings(
  sellerIds?: string[],
): Promise<SellerFinancialSettings[]> {
  let q = supabase
    .from("seller_financial_settings")
    .select(
      "seller_id,monthly_automation_cost,monthly_tools_cost,financial_notes,active_for_financial_analysis",
    );
  if (sellerIds && sellerIds.length > 0) q = q.in("seller_id", sellerIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data as SellerRow[]).map(toSeller);
}

export async function upsertSellerFinancialSettings(
  s: SellerFinancialSettings,
): Promise<void> {
  const { error } = await supabase
    .from("seller_financial_settings")
    .upsert(
      {
        seller_id: s.sellerId,
        monthly_automation_cost: s.monthlyAutomationCost,
        monthly_tools_cost: s.monthlyToolsCost,
        financial_notes: s.financialNotes,
        active_for_financial_analysis: s.activeForFinancialAnalysis,
      },
      { onConflict: "seller_id" },
    );
  if (error) throw error;
}
