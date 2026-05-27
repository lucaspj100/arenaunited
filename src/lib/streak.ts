// Calcula streak de "dias produtivos" consecutivos do vendedor.
// Dia produtivo = >=1 entrevista marcada OU >=1 matrícula aprovada na data.

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStreak(activeDates: Iterable<string>): number {
  const set = new Set(activeDates);
  const today = new Date();
  const todayKey = iso(today);

  const cursor = new Date(today);
  // Se ainda não teve atividade hoje, não quebra o streak — começa de ontem.
  if (!set.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (set.has(iso(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 365) break; // safety
  }
  return streak;
}

export function streakTier(streak: number): "cold" | "warm" | "hot" | "blazing" {
  if (streak <= 0) return "cold";
  if (streak < 7) return "warm";
  if (streak < 30) return "hot";
  return "blazing";
}