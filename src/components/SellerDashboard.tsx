import { Seller, formatBRL } from "@/lib/ranking";
import { ROLE_LABELS, PeriodRange } from "@/lib/commissions";
import { Enrollment } from "@/lib/enrollments";
import { Interview } from "@/lib/interviews";
import { ArrowDown, ArrowUp, Minus, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import type { PerformanceTier } from "@/lib/motivation";

type Totals = {
  scheduled: number;
  completed: number;
  approvedDeals: number;
  material: number;
  monthly: number;
  commission: number;
  enrollmentValue: number;
};

function computeTotals(enrollments: Enrollment[], interviews: Interview[]): Totals {
  const approved = enrollments.filter((e) => e.status === "approved");
  return {
    scheduled: interviews.length,
    completed: interviews.filter((i) =>
      ["realizada", "fechada", "perdida"].includes(i.status),
    ).length,
    approvedDeals: approved.length,
    material: approved.reduce((a, e) => a + e.materialValue, 0),
    monthly: approved.reduce((a, e) => a + e.monthlyFee, 0),
    commission: approved.reduce((a, e) => a + e.commissionAmount, 0),
    enrollmentValue: approved.reduce((a, e) => a + e.enrollmentValue, 0),
  };
}

function pctDelta(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function ordinal(n: number) {
  return `${n}º`;
}

export function SellerDashboard({
  seller,
  rank,
  totalSellers,
  range,
  isCurrentMonth,
  enrollmentsCurrent,
  interviewsCurrent,
  enrollmentsPrevious,
  interviewsPrevious,
  topSlot,
  headerSlot,
  mode,
}: {
  seller: Seller;
  rank: number | null;
  totalSellers: number;
  range: PeriodRange;
  isCurrentMonth: boolean;
  enrollmentsCurrent: Enrollment[];
  interviewsCurrent: Interview[];
  enrollmentsPrevious: Enrollment[];
  interviewsPrevious: Interview[];
  topSlot?: ReactNode;
  headerSlot?: ReactNode;
  mode?: PerformanceTier;
}) {
  const t = computeTotals(enrollmentsCurrent, interviewsCurrent);
  const p = computeTotals(enrollmentsPrevious, interviewsPrevious);
  const conv = t.completed ? Math.round((t.approvedDeals / t.completed) * 100) : 0;
  const ticket = t.approvedDeals ? t.enrollmentValue / t.approvedDeals : 0;

  return (
    <div className="space-y-8" data-mode={mode ?? "neutral"}>
      {topSlot}
      {/* Cabeçalho */}
      <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-5">
        <div className="size-20 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-display font-black text-2xl shrink-0">
          {seller.avatar ? (
            <img src={seller.avatar} alt={seller.name ?? ""} className="size-full object-cover" />
          ) : (
            (seller.name ?? "?").split(" ").map((n) => n[0] ?? "").slice(0, 2).join("").toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
            {ROLE_LABELS[seller.role] ?? seller.role}
          </div>
          <h2 className="font-display font-black text-2xl md:text-3xl leading-tight">{seller.name ?? "—"}</h2>
          <div className="text-xs text-muted-foreground mt-1">{range.label} · {range.from} → {range.to}</div>
          {headerSlot && <div className="mt-3">{headerSlot}</div>}
        </div>
        {rank && (
          <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Ranking geral</div>
            <div className="flex items-center justify-center gap-1.5 font-display font-black text-2xl text-gold">
              <Trophy className="size-5" /> {ordinal(rank)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">de {totalSellers}</div>
          </div>
        )}
      </section>

      {/* Cards principais */}
      <section>
        <h3 className="text-xs uppercase tracking-wider font-mono text-muted-foreground mb-3">No período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Entrevistas marcadas" value={String(t.scheduled)} />
          <StatCard label="Entrevistas realizadas" value={String(t.completed)} />
          <StatCard label="Taxa de conversão" value={`${conv}%`} />
          <StatCard label="Matrículas aprovadas" value={String(t.approvedDeals)} accent />
          <StatCard label="Material vendido" value={formatBRL(t.material)} mono />
          <StatCard label="Mensalidades" value={formatBRL(t.monthly)} mono />
          <StatCard label="Comissão prevista" value={formatBRL(t.commission)} mono accent />
          <StatCard label="Ticket médio" value={formatBRL(ticket)} mono />
        </div>
      </section>

      {/* Comparação */}
      <section>
        <h3 className="text-xs uppercase tracking-wider font-mono text-muted-foreground mb-3">
          vs. período anterior ({p.scheduled + p.approvedDeals + p.material > 0 ? `${p.approvedDeals} matrículas` : "sem registros"})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DeltaCard label="Matrículas" curr={t.approvedDeals} prev={p.approvedDeals} />
          <DeltaCard label="Material" curr={t.material} prev={p.material} money />
          <DeltaCard label="Comissão" curr={t.commission} prev={p.commission} money />
        </div>
      </section>

      {/* Meta do mês */}
      {isCurrentMonth && (
        <section>
          <h3 className="text-xs uppercase tracking-wider font-mono text-muted-foreground mb-3 flex items-center gap-2">
            <Target className="size-3.5" /> Meta do mês
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GoalBar
              label="Matrículas"
              current={t.approvedDeals}
              goal={seller.goalDeals}
              format={(n) => String(Math.round(n))}
              suffix=""
            />
            <GoalBar
              label="Material"
              current={t.material}
              goal={seller.goalMaterial}
              format={(n) => formatBRL(n)}
              suffix=""
            />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        accent ? "bg-gradient-to-br from-primary/10 to-transparent border-primary/30" : "bg-card border-border"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">{label}</div>
      <div className={`font-display font-bold text-xl tabular-nums truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  curr,
  prev,
  money,
}: {
  label: string;
  curr: number;
  prev: number;
  money?: boolean;
}) {
  const diff = curr - prev;
  const pct = pctDelta(curr, prev);
  const up = diff > 0;
  const down = diff < 0;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  const color = up ? "text-primary" : down ? "text-accent" : "text-muted-foreground";
  const fmt = (n: number) => (money ? formatBRL(n) : String(Math.round(n)));
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">{label}</div>
      <div className="font-display font-bold text-xl tabular-nums">{fmt(curr)}</div>
      <div className={`flex items-center gap-1 text-xs font-mono mt-1 ${color}`}>
        <Icon className="size-3.5" />
        {pct > 0 ? "+" : ""}
        {pct}% · {diff >= 0 ? "+" : ""}
        {fmt(diff)}
      </div>
    </div>
  );
}

function GoalBar({
  label,
  current,
  goal,
  format,
}: {
  label: string;
  current: number;
  goal: number;
  format: (n: number) => string;
  suffix?: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const reached = current >= goal && goal > 0;
  const missing = Math.max(0, goal - current);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold">{label}</div>
        <div className="text-xs font-mono text-muted-foreground">
          {format(current)} / {format(goal)}
        </div>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full ${reached ? "bg-gold" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`text-[11px] mt-2 ${reached ? "text-gold" : "text-muted-foreground"}`}>
        {reached
          ? `Meta batida! ${pct}% concluído.`
          : `Faltam ${format(missing)} para bater a meta (${pct}%).`}
      </div>
    </div>
  );
}