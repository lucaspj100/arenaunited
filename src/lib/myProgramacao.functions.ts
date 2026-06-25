import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { InterviewStatus } from "./interviews";

type InterviewRow = {
  id: string;
  seller_id: string;
  lead_name: string | null;
  lead_phone: string | null;
  scheduled_date: string;
  scheduled_time: string;
  status: InterviewStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const toInterview = (r: InterviewRow) => ({
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

export const getMyProgramacaoData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: seller, error: sellerError } = await context.supabase
      .from("sellers")
      .select("id, name, user_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sellerError) throw new Error(sellerError.message);

    if (!seller?.id) {
      return {
        sellerId: null,
        sellerName: null,
        interviews: [],
        debug: {
          userId: context.userId,
          sellerId: null,
          interviewsCount: 0,
          camillaSellerId: null,
          camilla: null,
        },
      };
    }

    const { data, error } = await context.supabase
      .from("interviews")
      .select("id,seller_id,lead_name,lead_phone,scheduled_date,scheduled_time,status,notes,created_at,updated_at")
      .eq("seller_id", seller.id)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as InterviewRow[];
    const camilla = rows.find((i) => (i.lead_name ?? "").toLowerCase().includes("camilla"));

    return {
      sellerId: seller.id,
      sellerName: seller.name ?? null,
      interviews: rows.map(toInterview),
      debug: {
        userId: context.userId,
        sellerId: seller.id,
        interviewsCount: rows.length,
        camillaSellerId: camilla?.seller_id ?? null,
        camilla: camilla
          ? {
              id: camilla.id,
              sellerId: camilla.seller_id,
              leadName: camilla.lead_name ?? "",
              scheduledDate: camilla.scheduled_date,
              scheduledTime: typeof camilla.scheduled_time === "string" ? camilla.scheduled_time.slice(0, 5) : "",
              status: camilla.status,
            }
          : null,
      },
    };
  });