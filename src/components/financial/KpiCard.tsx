import { formatBRL } from "@/lib/commissions";

type Tone = "default" | "success" | "warning" | "danger" | "primary";

const TONE_CLASSES: Record<Tone, string> = {
  default: "border-border bg-card",
  success: "border-emerald-500/40 bg-emerald-500/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  danger: "border-destructive/40 bg-destructive/5",
  primary: "border-primary/40 bg-primary/5",
};

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  format = "brl",
}: {
  label: string;
  value: number | string | null;
  hint?: string;
  tone?: Tone;
  format?: "brl" | "int" | "pct" | "ratio" | "text";
}) {
  let display: string;
  if (value === null || value === undefined) {
    display = "—";
  } else if (typeof value === "string") {
    display = value;
  } else if (format === "brl") {
    display = formatBRL(value);
  } else if (format === "pct") {
    display = `${(value * 100).toFixed(1)}%`;
  } else if (format === "ratio") {
    display = `${value.toFixed(2)}x`;
  } else {
    display = Math.round(value).toLocaleString("pt-BR");
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${TONE_CLASSES[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className="font-display font-bold text-xl mt-1">{display}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
