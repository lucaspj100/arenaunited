import { supabase } from "@/integrations/supabase/client";
import type { SellerRole } from "./commissions";

export type Enrollment = {
  id: string;
  sellerId: string;
  studentName: string;
  enrollmentDate: string;
  enrollmentValue: number;
  monthlyFee: number;
  materialValue: number;
  roleSnapshot: SellerRole;
  commissionRate: number;
  commissionAmount: number;
  notes: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  seller_id: string;
  student_name: string;
  enrollment_date: string;
  enrollment_value: number | string;
  monthly_fee: number | string;
  material_value: number | string;
  role_snapshot: SellerRole;
  commission_rate: number | string;
  commission_amount: number | string;
  notes: string | null;
  created_at: string;
};

const COLS =
  "id,seller_id,student_name,enrollment_date,enrollment_value,monthly_fee,material_value,role_snapshot,commission_rate,commission_amount,notes,created_at";

const toEnrollment = (r: Row): Enrollment => ({
  id: r.id,
  sellerId: r.seller_id,
  studentName: r.student_name,
  enrollmentDate: r.enrollment_date,
  enrollmentValue: Number(r.enrollment_value),
  monthlyFee: Number(r.monthly_fee),
  materialValue: Number(r.material_value),
  roleSnapshot: r.role_snapshot,
  commissionRate: Number(r.commission_rate),
  commissionAmount: Number(r.commission_amount),
  notes: r.notes,
  createdAt: r.created_at,
});

export type EnrollmentInput = {
  sellerId: string;
  studentName: string;
  enrollmentDate: string;
  enrollmentValue: number;
  monthlyFee: number;
  materialValue: number;
  notes?: string | null;
};

export async function fetchEnrollments(filters?: {
  sellerId?: string;
  from?: string;
  to?: string;
}): Promise<Enrollment[]> {
  let q = supabase
    .from("enrollments")
    .select(COLS)
    .order("enrollment_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters?.sellerId) q = q.eq("seller_id", filters.sellerId);
  if (filters?.from) q = q.gte("enrollment_date", filters.from);
  if (filters?.to) q = q.lte("enrollment_date", filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(toEnrollment);
}

export async function createEnrollment(input: EnrollmentInput): Promise<Enrollment> {
  const { data, error } = await supabase
    .from("enrollments")
    .insert({
      seller_id: input.sellerId,
      student_name: input.studentName,
      enrollment_date: input.enrollmentDate,
      enrollment_value: input.enrollmentValue,
      monthly_fee: input.monthlyFee,
      material_value: input.materialValue,
      notes: input.notes ?? null,
      role_snapshot: "consultor",
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return toEnrollment(data as Row);
}

export async function updateEnrollment(
  id: string,
  patch: Partial<EnrollmentInput>,
): Promise<void> {
  const row: {
    student_name?: string;
    enrollment_date?: string;
    enrollment_value?: number;
    monthly_fee?: number;
    material_value?: number;
    notes?: string | null;
    seller_id?: string;
  } = {};
  if (patch.studentName !== undefined) row.student_name = patch.studentName;
  if (patch.enrollmentDate !== undefined) row.enrollment_date = patch.enrollmentDate;
  if (patch.enrollmentValue !== undefined) row.enrollment_value = patch.enrollmentValue;
  if (patch.monthlyFee !== undefined) row.monthly_fee = patch.monthlyFee;
  if (patch.materialValue !== undefined) row.material_value = patch.materialValue;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.sellerId !== undefined) row.seller_id = patch.sellerId;
  const { error } = await supabase.from("enrollments").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteEnrollment(id: string): Promise<void> {
  const { error } = await supabase.from("enrollments").delete().eq("id", id);
  if (error) throw error;
}
