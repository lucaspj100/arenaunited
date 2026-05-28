import { supabase } from "@/integrations/supabase/client";

export const INTERVIEW_STATUSES = [
  "marcada",
  "realizada",
  "fechada",
  "nao_compareceu",
  "reagendada",
  "perdida",
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  marcada: "Marcada",
  realizada: "Realizada",
  fechada: "Fechada",
  nao_compareceu: "Não compareceu",
  reagendada: "Reagendada",
  perdida: "Perdida",
};

export type Interview = {
  id: string;
  sellerId: string;
  leadName: string;
  leadPhone: string | null;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM[:SS]
  status: InterviewStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  seller_id: string;
  lead_name: string;
  lead_phone: string | null;
  scheduled_date: string;
  scheduled_time: string;
  status: InterviewStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const COLS =
  "id,seller_id,lead_name,lead_phone,scheduled_date,scheduled_time,status,notes,created_at,updated_at";

const toInterview = (r: Row): Interview => ({
  id: r.id,
  sellerId: r.seller_id,
  leadName: r.lead_name ?? "",
  leadPhone: r.lead_phone,
  scheduledDate: r.scheduled_date,
  scheduledTime: typeof r.scheduled_time === "string" ? r.scheduled_time.slice(0, 5) : "",
  status: r.status,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function fetchInterviews(filters?: {
  sellerId?: string;
  from?: string;
  to?: string;
}): Promise<Interview[]> {
  let q = supabase
    .from("interviews")
    .select(COLS)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });
  if (filters?.sellerId) q = q.eq("seller_id", filters.sellerId);
  if (filters?.from) q = q.gte("scheduled_date", filters.from);
  if (filters?.to) q = q.lte("scheduled_date", filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(toInterview);
}

export type InterviewInput = {
  sellerId: string;
  leadName: string;
  leadPhone?: string | null;
  scheduledDate: string;
  scheduledTime: string;
  status: InterviewStatus;
  notes?: string | null;
};

export async function createInterview(input: InterviewInput): Promise<Interview> {
  const { data, error } = await supabase
    .from("interviews")
    .insert({
      seller_id: input.sellerId,
      lead_name: input.leadName,
      lead_phone: input.leadPhone ?? null,
      scheduled_date: input.scheduledDate,
      scheduled_time: input.scheduledTime,
      status: input.status,
      notes: input.notes ?? null,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return toInterview(data as Row);
}

export async function updateInterview(
  id: string,
  patch: Partial<InterviewInput>,
): Promise<void> {
  const row: {
    seller_id?: string;
    lead_name?: string;
    lead_phone?: string | null;
    scheduled_date?: string;
    scheduled_time?: string;
    status?: InterviewStatus;
    notes?: string | null;
  } = {};
  if (patch.sellerId !== undefined) row.seller_id = patch.sellerId;
  if (patch.leadName !== undefined) row.lead_name = patch.leadName;
  if (patch.leadPhone !== undefined) row.lead_phone = patch.leadPhone ?? null;
  if (patch.scheduledDate !== undefined) row.scheduled_date = patch.scheduledDate;
  if (patch.scheduledTime !== undefined) row.scheduled_time = patch.scheduledTime;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  const { error } = await supabase.from("interviews").update(row).eq("id", id);

  if (error) throw error;
}

export async function deleteInterview(id: string): Promise<void> {
  const { error } = await supabase.from("interviews").delete().eq("id", id);
  if (error) throw error;
}

// Helpers de data (semana segunda→domingo, no fuso local)
export function todayISO(): string {
  const d = new Date();
  return formatDate(d);
}
export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}
export function weekRangeISO(): { start: string; end: string } {
  const d = new Date();
  const day = d.getDay(); // 0 Sun..6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDate(monday), end: formatDate(sunday) };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
