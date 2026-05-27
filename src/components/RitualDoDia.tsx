import { Check, Circle, Target } from "lucide-react";
import type { RitualPlan } from "@/lib/ritual";

export function RitualDoDia({ plan }: { plan: RitualPlan }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="size-4 text-primary" />
        <h3 className="font-display font-bold text-sm uppercase tracking-wider">
          {plan.title}
        </h3>
      </div>
      <ul className="space-y-2.5">
        {plan.items.map((item) => {
          const pct = item.target > 0 ? Math.min(100, (item.current / item.target) * 100) : 0;
          return (
            <li
              key={item.id}
              className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${
                item.done
                  ? "border-success/40 bg-success/5"
                  : "border-border bg-background/40"
              }`}
            >
              <div
                className={`shrink-0 size-7 rounded-full flex items-center justify-center ${
                  item.done ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"
                }`}
              >
                {item.done ? <Check className="size-4" /> : <Circle className="size-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold leading-snug ${item.done ? "line-through opacity-70" : ""}`}>
                  {item.label}
                </div>
                {item.hint && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</div>
                )}
                {item.target > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.done ? "bg-success" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                      {item.current}/{item.target}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}