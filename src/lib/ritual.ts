import type { Enrollment } from "./enrollments";
import type { Interview } from "./interviews";
import type { Seller } from "./ranking";
import type { PerformanceTier } from "./motivation";
import { formatBRL } from "./commissions";

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type RitualItem = {
  id: string;
  label: string;
  hint?: string;
  current: number;
  target: number;
  done: boolean;
};

export type RitualPlan = {
  title: string;
  items: RitualItem[];
};

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Gera 3 micro-metas (ou 1 no modo crise) baseado nos números reais do dia/mês.
 */
export function buildRitual({
  seller,
  tier,
  enrollments60d,
  interviews60d,
}: {
  seller: Seller;
  tier: PerformanceTier;
  enrollments60d: Enrollment[];
  interviews60d: Interview[];
}): RitualPlan {
  const now = new Date();
  const todayKey = iso(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = iso(yesterday);

  const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const safeInterviews = (interviews60d ?? []).filter((i) => i && typeof i.scheduledDate === "string");
  const safeEnrollments = (enrollments60d ?? []).filter((e) => e && typeof e.enrollmentDate === "string");

  // Hoje
  const interviewsToday = safeInterviews.filter((i) => i.scheduledDate === todayKey);
  const interviewsScheduledToday = interviewsToday.length;
  const dealsToday = safeEnrollments.filter(
    (e) => e.enrollmentDate === todayKey && e.status === "approved",
  ).length;

  // Ontem
  const interviewsYesterday = safeInterviews.filter((i) => i.scheduledDate === yKey).length;

  // Mês
  const monthApproved = safeEnrollments.filter(
    (e) =>
      e.status === "approved" &&
      e.enrollmentDate >= monthStart &&
      e.enrollmentDate <= monthEnd,
  );
  const monthDeals = monthApproved.length;
  const monthMaterial = monthApproved.reduce(
    (a, e) => a + (Number.isFinite(e.materialValue) ? e.materialValue : 0),
    0,
  );
  const goalDeals = Number.isFinite(seller.goalDeals) ? seller.goalDeals : 0;
  const goalMaterial = Number.isFinite(seller.goalMaterial) ? seller.goalMaterial : 0;
  const missingDeals = Math.max(0, goalDeals - monthDeals);
  const missingMaterial = Math.max(0, goalMaterial - monthMaterial);

  const daysLeftInMonth =
    daysInMonth(now) - now.getDate() + 1;

  // ----- Modo crise: 1 ação simples -----
  if (tier === "struggling") {
    const nextPending = interviewsToday.find((i) => i.status === "marcada" && i.leadName);
    if (nextPending) {
      return {
        title: "Uma coisa de cada vez",
        items: [
          {
            id: "next-interview",
            label: `Realize a entrevista de ${nextPending.leadName}`,
            hint: nextPending.scheduledTime ? `Hoje às ${nextPending.scheduledTime}` : "Hoje",
            current: 0,
            target: 1,
            done: false,
          },
        ],
      };
    }
    return {
      title: "Uma coisa de cada vez",
      items: [
        {
          id: "one-call",
          label: "Marque 1 entrevista hoje",
          hint: "Só uma. Comece pelo telefone mais quente.",
          current: interviewsScheduledToday,
          target: 1,
          done: interviewsScheduledToday >= 1,
        },
      ],
    };
  }

  // ----- Modo normal: 3 micro-metas dinâmicas -----
  const items: RitualItem[] = [];

  // 1) Entrevistas hoje vs ontem
  const interviewTarget = Math.max(2, interviewsYesterday + (tier === "top" ? 1 : 0));
  items.push({
    id: "interviews",
    label: `Marque ${interviewTarget} entrevistas hoje`,
    hint:
      interviewsYesterday > 0
        ? `Ontem você marcou ${interviewsYesterday}`
        : "Comece o dia com volume",
    current: interviewsScheduledToday,
    target: interviewTarget,
    done: interviewsScheduledToday >= interviewTarget,
  });

  // 2) Matrículas — ritmo necessário pra meta
  if (missingDeals > 0) {
    const pace = Math.max(1, Math.ceil(missingDeals / Math.max(1, daysLeftInMonth)));
    const targetToday = Math.min(pace, missingDeals);
    items.push({
      id: "deals",
      label:
        targetToday === 1
          ? "Feche 1 matrícula hoje"
          : `Feche ${targetToday} matrículas hoje`,
      hint:
        missingDeals === 1
          ? "Falta só 1 pra meta do mês"
          : `Faltam ${missingDeals} pra meta · ${daysLeftInMonth} ${daysLeftInMonth === 1 ? "dia" : "dias"} restantes`,
      current: dealsToday,
      target: targetToday,
      done: dealsToday >= targetToday,
    });
  } else {
    // Já bateu meta de matrículas: pressão pra não relaxar
    items.push({
      id: "deals-extra",
      label: "Feche +1 matrícula hoje",
      hint: "Meta batida — agora é construir vantagem",
      current: dealsToday,
      target: 1,
      done: dealsToday >= 1,
    });
  }

  // 3) Material — empurrão ou meta
  if (missingMaterial > 0) {
    items.push({
      id: "material",
      label: `Avance R$ ${Math.round(missingMaterial / Math.max(1, daysLeftInMonth)).toLocaleString("pt-BR")} em material`,
      hint: `Faltam ${formatBRL(missingMaterial)} pra meta do mês`,
      current: 0,
      target: 1,
      done: false,
    });
  } else {
    items.push({
      id: "material-done",
      label: "Meta de material batida",
      hint: `${formatBRL(monthMaterial)} acumulados — siga vendendo`,
      current: 1,
      target: 1,
      done: true,
    });
  }

  const title =
    tier === "top"
      ? "Ritual de quem lidera"
      : tier === "rising"
        ? "Ritual de quem está subindo"
        : "Ritual do dia";

  return { title, items };
}