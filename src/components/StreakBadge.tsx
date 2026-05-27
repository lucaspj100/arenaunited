import { Flame } from "lucide-react";
import { streakTier } from "@/lib/streak";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  const tier = streakTier(streak);
  const color =
    tier === "blazing"
      ? "text-gold"
      : tier === "hot"
        ? "text-accent"
        : "text-primary";
  const ring =
    tier === "blazing"
      ? "border-gold/50 bg-gold/10"
      : tier === "hot"
        ? "border-accent/40 bg-accent/10"
        : "border-primary/40 bg-primary/10";
  const label = streak === 1 ? "1 dia" : `${streak} dias`;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${ring}`}
      title={`${streak} ${streak === 1 ? "dia produtivo consecutivo" : "dias produtivos consecutivos"}`}
    >
      <Flame className={`size-4 ${color}`} />
      <span className={`font-mono text-xs font-bold ${color}`}>{label}</span>
    </div>
  );
}