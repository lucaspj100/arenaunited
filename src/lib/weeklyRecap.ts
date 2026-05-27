import type { Enrollment } from "./enrollments";
import type { Interview } from "./interviews";
import type { Seller } from "./ranking";
import { formatBRL } from "./commissions";
import { pickQuote, classifyPerformance } from "./motivation";

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Segunda da semana atual (semana segunda→domingo)
export function currentWeekStart(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isFriday(now = new Date()): boolean {
  return now.getDay() === 5;
}

export type RecapSlide =
  | { kind: "cover"; name: string; avatar?: string | null; weekLabel: string }
  | { kind: "stat"; eyebrow: string; value: string; delta?: string; positive?: boolean }
  | { kind: "bestDay"; weekday: string; count: number }
  | { kind: "rank"; rank: number; total: number; delta: number }
  | { kind: "quote"; text: string; author: string };

const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function buildWeeklyRecap({
  seller,
  rank,
  totalSellers,
  enrollments60d,
}: {
  seller: Seller;
  rank: number | null;
  totalSellers: number;
  enrollments60d: Enrollment[];
  // interviews mantidos opcionalmente para futuro
  interviews60d?: Interview[];
}): { slides: RecapSlide[]; weekStartKey: string } {
  const monday = currentWeekStart();
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevSunday.getDate() + 6);

  const inRange = (date: string, from: Date, to: Date) =>
    date >= iso(from) && date <= iso(to);

  const approved = enrollments60d.filter((e) => e.status === "approved");
  const thisWeek = approved.filter((e) => inRange(e.enrollmentDate, monday, sunday));
  const lastWeek = approved.filter((e) => inRange(e.enrollmentDate, prevMonday, prevSunday));

  const thisDeals = thisWeek.length;
  const lastDeals = lastWeek.length;
  const thisCommission = thisWeek.reduce((a, e) => a + e.commissionAmount, 0);

  // Melhor dia
  const byDay = new Map<string, number>();
  for (const e of thisWeek) {
    byDay.set(e.enrollmentDate, (byDay.get(e.enrollmentDate) ?? 0) + 1);
  }
  let bestDay: { date: string; count: number } | null = null;
  for (const [date, count] of byDay.entries()) {
    if (!bestDay || count > bestDay.count) bestDay = { date, count };
  }

  const weekLabel = `${monday.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → ${sunday.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;

  const slides: RecapSlide[] = [
    { kind: "cover", name: seller.name, avatar: seller.avatar, weekLabel },
    {
      kind: "stat",
      eyebrow: "Matrículas da semana",
      value: String(thisDeals),
      delta:
        lastDeals === 0
          ? thisDeals > 0
            ? "Estreia na semana"
            : "Sem registros na semana anterior"
          : `${thisDeals - lastDeals >= 0 ? "+" : ""}${thisDeals - lastDeals} vs semana passada`,
      positive: thisDeals >= lastDeals,
    },
    {
      kind: "stat",
      eyebrow: "Comissão acumulada",
      value: formatBRL(thisCommission),
    },
  ];

  if (bestDay) {
    const wd = new Date(bestDay.date + "T00:00:00").getDay();
    slides.push({
      kind: "bestDay",
      weekday: WEEKDAYS_PT[wd],
      count: bestDay.count,
    });
  }

  if (rank) {
    slides.push({ kind: "rank", rank, total: totalSellers, delta: 0 });
  }

  const tier = classifyPerformance({
    rank: rank ?? totalSellers,
    total: Math.max(totalSellers, 1),
    deals: seller.deals,
    goalDeals: seller.goalDeals,
  });
  const q = pickQuote(seller.id, tier);
  slides.push({ kind: "quote", text: q.text, author: q.author });

  return { slides, weekStartKey: iso(monday) };
}