import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const PayloadSchema = z.object({
  event_type: z.enum([
    "crm_interview_scheduled",
    "crm_interview_done",
    "crm_interview_no_show",
    "crm_interview_rescheduled",
    "crm_enrollment_created",
    "crm_lost_after_interview",
  ]),
  crm_lead_id: z.string().min(1),
  crm_user_id: z.string().uuid(),
  lead_name: z.string().optional().nullable(),
  lead_phone: z.string().optional().nullable(),
  interview_date: z.string().optional().nullable(),
  interview_time: z.string().optional().nullable(),
  interview_notes: z.string().optional().nullable(),
  enrollment_value: z.number().optional().nullable(),
  monthly_fee: z.number().optional().nullable(),
  material_value: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  occurred_at: z.string().optional().nullable(),
});

type Payload = z.infer<typeof PayloadSchema>;

function extractSignatureHeader(request: Request): {
  headerName: "x-crm-signature" | "x-webhook-signature" | null;
  signatureValue: string | null;
} {
  const headerNames = ["x-crm-signature", "x-webhook-signature"] as const;
  for (const name of headerNames) {
    const raw = request.headers.get(name);
    if (raw) {
      const value = raw.startsWith("sha256=") ? raw.slice(7) : raw;
      return { headerName: name, signatureValue: value };
    }
  }
  return { headerName: null, signatureValue: null };
}

function verifySignature(rawBody: string, signatureValue: string | null, secret: string): boolean {
  if (!signatureValue) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sig = Buffer.from(signatureValue.trim());
  const exp = Buffer.from(expected);
  if (sig.length !== exp.length) return false;
  try {
    return timingSafeEqual(sig, exp);
  } catch {
    return false;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/crm-webhook")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type, x-crm-signature, x-webhook-signature",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        };
        const secret = process.env.CRM_WEBHOOK_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ error: "secret_not_configured" }), {
            status: 500,
            headers: cors,
          });
        }

        const rawBody = await request.text();
        const { headerName, signatureValue } = extractSignatureHeader(request);

        let json: unknown;
        try {
          json = JSON.parse(rawBody);
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), {
            status: 400,
            headers: cors,
          });
        }

        const parsed = PayloadSchema.safeParse(json);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "invalid_payload", details: parsed.error.flatten() }),
            { status: 400, headers: cors },
          );
        }
        const payload: Payload = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Cria log inicial
        const { data: logRow, error: logErr } = await supabaseAdmin
          .from("crm_integration_events")
          .insert({
            event_type: payload.event_type,
            crm_lead_id: payload.crm_lead_id,
            crm_user_id: payload.crm_user_id,
            payload: payload as any,
            status: "received",
          })
          .select("id")
          .single();
        if (logErr || !logRow) {
          return new Response(JSON.stringify({ error: "log_failed", message: logErr?.message }), {
            status: 500,
            headers: cors,
          });
        }
        const logId = logRow.id as string;

        const finalize = async (
          status: "processed" | "ignored" | "error",
          opts?: { error?: string; sellerId?: string | null },
        ) => {
          await supabaseAdmin
            .from("crm_integration_events")
            .update({
              status,
              error_message: opts?.error ?? null,
              arena_seller_id: opts?.sellerId ?? null,
              processed_at: new Date().toISOString(),
            })
            .eq("id", logId);
        };

        try {
          // 2. Procura vínculo ativo
          const { data: link } = await supabaseAdmin
            .from("crm_arena_seller_links")
            .select("arena_seller_id")
            .eq("crm_user_id", payload.crm_user_id)
            .eq("active", true)
            .maybeSingle();

          if (!link) {
            await finalize("ignored", { error: "no_active_link" });
            return new Response(JSON.stringify({ ok: true, status: "ignored" }), {
              status: 200,
              headers: cors,
            });
          }
          const sellerId = link.arena_seller_id as string;

          // 3. Dispatch
          await dispatchEvent(supabaseAdmin, sellerId, payload);

          await finalize("processed", { sellerId });
          return new Response(JSON.stringify({ ok: true, status: "processed" }), {
            status: 200,
            headers: cors,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await finalize("error", { error: msg });
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 200,
            headers: cors,
          });
        }
      },
    },
  },
});

async function dispatchEvent(
  admin: any,
  sellerId: string,
  p: Payload,
): Promise<void> {
  const lead_name = (p.lead_name ?? "Lead CRM").slice(0, 200);
  const lead_phone = p.lead_phone ?? null;
  const date = p.interview_date ?? null;
  const time = p.interview_time ?? null;

  switch (p.event_type) {
    case "crm_interview_scheduled":
    case "crm_interview_done": {
      if (!date || !time) throw new Error("interview_date/time required");
      const newStatus = p.event_type === "crm_interview_scheduled" ? "marcada" : "realizada";
      await upsertInterviewByLead(admin, {
        sellerId,
        crmLeadId: p.crm_lead_id,
        leadName: lead_name,
        leadPhone: lead_phone,
        date,
        time,
        status: newStatus,
        notes: p.interview_notes ?? null,
      });
      return;
    }
    case "crm_interview_no_show": {
      await updateInterviewStatus(admin, sellerId, p.crm_lead_id, "nao_compareceu", p.interview_notes);
      return;
    }
    case "crm_interview_rescheduled": {
      if (!date || !time) throw new Error("interview_date/time required");
      await upsertInterviewByLead(admin, {
        sellerId,
        crmLeadId: p.crm_lead_id,
        leadName: lead_name,
        leadPhone: lead_phone,
        date,
        time,
        status: "reagendada",
        notes: p.interview_notes ?? null,
      });
      return;
    }
    case "crm_lost_after_interview": {
      await updateInterviewStatus(admin, sellerId, p.crm_lead_id, "perdida", p.interview_notes);
      return;
    }
    case "crm_enrollment_created": {
      // Verifica se já existe matrícula com mesmo crm_lead_id
      const { data: existing } = await admin
        .from("enrollments")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("crm_lead_id", p.crm_lead_id)
        .maybeSingle();
      if (!existing) {
        const { error } = await admin.from("enrollments").insert({
          seller_id: sellerId,
          student_name: lead_name,
          enrollment_date: (p.occurred_at ?? "").slice(0, 10) || todayISO(),
          enrollment_value: p.enrollment_value ?? 0,
          monthly_fee: p.monthly_fee ?? 0,
          material_value: p.material_value ?? 0,
          status: "approved",
          crm_lead_id: p.crm_lead_id,
          notes: p.interview_notes ?? null,
        });
        if (error) throw new Error("enrollment_insert_failed: " + error.message);
      }
      // Marca entrevista relacionada como fechada
      await updateInterviewStatus(admin, sellerId, p.crm_lead_id, "fechada", null);
      return;
    }
  }
}

async function upsertInterviewByLead(
  admin: any,
  args: {
    sellerId: string;
    crmLeadId: string;
    leadName: string;
    leadPhone: string | null;
    date: string;
    time: string;
    status: string;
    notes: string | null;
  },
) {
  const { data: existing } = await admin
    .from("interviews")
    .select("id")
    .eq("seller_id", args.sellerId)
    .eq("crm_lead_id", args.crmLeadId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("interviews")
      .update({
        lead_name: args.leadName,
        lead_phone: args.leadPhone,
        scheduled_date: args.date,
        scheduled_time: args.time,
        status: args.status,
        notes: args.notes,
      })
      .eq("id", existing.id);
    if (error) throw new Error("interview_update_failed: " + error.message);
  } else {
    const { error } = await admin.from("interviews").insert({
      seller_id: args.sellerId,
      lead_name: args.leadName,
      lead_phone: args.leadPhone,
      scheduled_date: args.date,
      scheduled_time: args.time,
      status: args.status,
      notes: args.notes,
      crm_lead_id: args.crmLeadId,
    });
    if (error) throw new Error("interview_insert_failed: " + error.message);
  }
}

async function updateInterviewStatus(
  admin: any,
  sellerId: string,
  crmLeadId: string,
  newStatus: string,
  notes: string | null | undefined,
) {
  const update: Record<string, unknown> = { status: newStatus };
  if (notes) update.notes = notes;
  const { error } = await admin
    .from("interviews")
    .update(update)
    .eq("seller_id", sellerId)
    .eq("crm_lead_id", crmLeadId);
  if (error) throw new Error("interview_status_update_failed: " + error.message);
}