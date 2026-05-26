import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AuthBar } from "@/components/AuthBar";
import { InterviewStatusBadge } from "@/components/InterviewStatusBadge";
import { InterviewFormDialog } from "@/components/InterviewFormDialog";
import {
  Interview,
  InterviewInput,
  InterviewStatus,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  createInterview,
  deleteInterview,
  fetchInterviews,
  todayISO,
  tomorrowISO,
  updateInterview,
  weekRangeISO,
} from "@/lib/interviews";
import { fetchSellers } from "@/lib/storage";
import { Seller, conversionRate } from "@/lib/ranking";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Crown,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trophy,
  Users,
} from "lucide-react";

type Filter = "hoje" | "amanha" | "semana";

export const Route = createFileRoute("/agenda-equipe")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AgendaEquipe,
  head: () => ({
    meta: [
      { title: "Agenda da Equipe — Arena United" },
      { name: "description", content: "Programação completa da equipe comercial." },
    ],
  }),
});

function AgendaEquipe() {
  const { loading: loadingUser, role, userId, email } = useCurrentUser();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<Filter>("hoje");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gridDate, setGridDate] = useState<string>(todayISO());

  const [editing, setEditing] = useState<Interview | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const week = weekRangeISO();
      const [iv, sl] = await Promise.all([
        fetchInterviews({ from: week.start, to: week.end }),
        fetchSellers(),
      ]);
      setInterviews(iv);
      setSellers(sl);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin" || role === "diretor" || role === "ceo" || role === "presidente") reload();
  }, [role]);

  const today = todayISO();
  const tomorrow = tomorrowISO();
  const week = weekRangeISO();

  const sellerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sellers) m.set(s.id, s.name);
    return m;
  }, [sellers]);

  const filtered = useMemo(() => {
    return interviews.filter((i) => {
      if (filter === "hoje" && i.scheduledDate !== today) return false;
      if (filter === "amanha" && i.scheduledDate !== tomorrow) return false;
      if (filter === "semana" && (i.scheduledDate < week.start || i.scheduledDate > week.end))
        return false;
      if (sellerFilter !== "all" && i.sellerId !== sellerFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    });
  }, [interviews, filter, sellerFilter, statusFilter, today, tomorrow, week.start, week.end]);

  // Cards do topo
  const todays = interviews.filter((i) => i.scheduledDate === today);
  const tomorrows = interviews.filter((i) => i.scheduledDate === tomorrow);
  const scheduledToday = todays.length;
  const scheduledTomorrow = tomorrows.length;
  const completedToday = todays.filter((i) => i.status === "realizada" || i.status === "fechada").length;
  const closedToday = todays.filter((i) => i.status === "fechada").length;

  // Vendedor com mais entrevistas hoje
  type TopToday = { sellerId: string; count: number };
  const topTodayBySeller = ((): TopToday | null => {
    const counts = new Map<string, number>();
    for (const i of todays) counts.set(i.sellerId, (counts.get(i.sellerId) ?? 0) + 1);
    let best: TopToday | null = null;
    counts.forEach((count, sellerId) => {
      if (!best || count > (best as TopToday).count) best = { sellerId, count };
    });
    return best;
  })();

  // Maior conversão da semana (>= 3 realizadas)
  type TopConv = { sellerId: string; rate: number; realized: number };
  const topConversion = ((): TopConv | null => {
    type Agg = { realized: number; closed: number };
    const agg = new Map<string, Agg>();
    for (const i of interviews) {
      const a = agg.get(i.sellerId) ?? { realized: 0, closed: 0 };
      if (i.status === "realizada" || i.status === "fechada") a.realized += 1;
      if (i.status === "fechada") a.closed += 1;
      agg.set(i.sellerId, a);
    }
    let best: TopConv | null = null;
    agg.forEach((a, sellerId) => {
      if (a.realized < 3) return;
      const rate = (a.closed / a.realized) * 100;
      if (!best || rate > (best as TopConv).rate) best = { sellerId, rate, realized: a.realized };
    });
    return best;
  })();




  // Resumo por vendedor
  const summary = useMemo(() => {
    return sellers
      .map((s) => {
        const own = interviews.filter((i) => i.sellerId === s.id);
        const todayList = own.filter((i) => i.scheduledDate === today);
        const tomorrowList = own.filter((i) => i.scheduledDate === tomorrow);
        const realizedWeek = own.filter(
          (i) => i.status === "realizada" || i.status === "fechada",
        ).length;
        const closedWeek = own.filter((i) => i.status === "fechada").length;
        const conv = conversionRate({
          weekCompleted: realizedWeek,
          weekEnrollments: closedWeek,
        });
        return {
          id: s.id,
          name: s.name,
          today: todayList.length,
          tomorrow: tomorrowList.length,
          realized: realizedWeek,
          closed: closedWeek,
          conv,
        };
      })
      .sort((a, b) => b.closed - a.closed || b.realized - a.realized);
  }, [sellers, interviews, today, tomorrow]);

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  if (role !== "admin" && role !== "diretor" && role !== "ceo" && role !== "presidente") {
    return (
      <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-10">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Ranking
          </Link>
          <AuthBar role={role} email={email} userId={userId} />
        </header>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Esta página é exclusiva para administradores.
        </div>
      </main>
    );
  }

  const handleSave = async (input: InterviewInput) => {
    if (editing) await updateInterview(editing.id, input);
    else await createInterview(input);
    await reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta entrevista?")) return;
    await deleteInterview(id);
    await reload();
  };

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 md:px-8 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Ranking
        </Link>
        <AuthBar role={role} email={email} userId={userId} />
      </header>

      <section className="mb-8">
        <h1 className="font-display font-black text-2xl md:text-3xl mb-1">Agenda da Equipe</h1>
        <p className="text-sm text-muted-foreground">Programação completa de entrevistas da equipe comercial.</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <SummaryCard icon={CalendarDays} label="Marcadas hoje" value={String(scheduledToday)} />
        <SummaryCard icon={CalendarDays} label="Marcadas amanhã" value={String(scheduledTomorrow)} />
        <SummaryCard icon={CheckCircle2} label="Realizadas hoje" value={String(completedToday)} accent="accent" />
        <SummaryCard icon={Trophy} label="Matrículas hoje" value={String(closedToday)} accent="gold" />
        <SummaryCard
          icon={Crown}
          label="Mais entrevistas hoje"
          value={topTodayBySeller ? sellerNameById.get(topTodayBySeller!.sellerId) ?? "—" : "—"}
          highlight={topTodayBySeller ? `${topTodayBySeller!.count} hoje` : undefined}
          accent="primary"
        />
        <SummaryCard
          icon={Target}
          label="Maior conversão da semana"
          value={topConversion ? sellerNameById.get(topConversion!.sellerId) ?? "—" : "—"}
          highlight={topConversion ? `${topConversion!.rate.toFixed(1).replace(".", ",")}%` : undefined}

          accent="gold"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-secondary p-1">
            {(["hoje", "amanha", "semana"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${
                  filter === f ? "bg-primary text-primary-foreground" : "hover:bg-background/40"
                }`}
              >
                {f === "amanha" ? "Amanhã" : f === "semana" ? "Esta semana" : "Hoje"}
              </button>
            ))}
          </div>
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-1.5 text-xs"
          >
            <option value="all">Todos vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-1.5 text-xs"
          >
            <option value="all">Todos status</option>
            {INTERVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>{INTERVIEW_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <div className="ml-auto">
            <button
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
            >
              <Plus className="size-3.5" /> Nova entrevista
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-bold">Agenda · {filtered.length} entrevista(s)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma entrevista com os filtros selecionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2">Vendedor</th>
                  <th className="text-left px-4 py-2">Lead</th>
                  <th className="text-left px-4 py-2">Telefone</th>
                  <th className="text-left px-4 py-2">Data</th>
                  <th className="text-left px-4 py-2">Hora</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Observações</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-2 font-medium">{sellerNameById.get(i.sellerId) ?? "—"}</td>
                    <td className="px-4 py-2">{i.leadName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{i.leadPhone ?? "—"}</td>
                    <td className="px-4 py-2 font-mono">{formatBR(i.scheduledDate)}</td>
                    <td className="px-4 py-2 font-mono">{i.scheduledTime}</td>
                    <td className="px-4 py-2"><InterviewStatusBadge status={i.status} /></td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[260px] truncate" title={i.notes ?? ""}>
                      {i.notes ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => { setCreating(false); setEditing(i); }}
                          className="p-1.5 rounded-md bg-secondary hover:bg-secondary/70"
                          title="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
                          className="p-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25"
                          title="Excluir"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h3 className="font-display font-bold">Resumo por vendedor · esta semana</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2">Vendedor</th>
                <th className="text-right px-4 py-2">Hoje</th>
                <th className="text-right px-4 py-2">Amanhã</th>
                <th className="text-right px-4 py-2">Realizadas</th>
                <th className="text-right px-4 py-2">Fechadas</th>
                <th className="text-right px-4 py-2">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{s.today}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{s.tomorrow}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{s.realized}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-gold">{s.closed}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-primary">
                    {s.conv.toFixed(1).replace(".", ",")}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TimeSlotGrid
        sellers={sellers}
        interviews={interviews}
        date={gridDate}
        onDateChange={setGridDate}
        onPick={(i) => { setCreating(false); setEditing(i); }}
      />

      <InterviewFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) { setCreating(false); setEditing(null); }
        }}
        initial={editing}
        canEditAll
        sellers={sellers.map((s) => ({ id: s.id, name: s.name }))}
        onSave={handleSave}
      />
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  highlight,
  accent,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  highlight?: string;
  accent?: "primary" | "accent" | "gold";
}) {
  const map: Record<string, string> = {
    primary: "from-primary/20 border-primary/30",
    accent: "from-accent/20 border-accent/30",
    gold: "from-gold/20 border-gold/40",
  };
  const cls = accent ? `bg-gradient-to-br ${map[accent]} to-transparent` : "bg-card border-border";
  return (
    <div className={`rounded-2xl p-4 border ${cls}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="font-display font-bold text-base md:text-lg truncate">{value}</div>
      {highlight && <div className="text-xs font-mono text-primary mt-1">{highlight}</div>}
    </div>
  );
}

function TimeSlotGrid({
  sellers,
  interviews,
  date,
  onDateChange,
  onPick,
}: {
  sellers: Seller[];
  interviews: Interview[];
  date: string;
  onDateChange: (d: string) => void;
  onPick: (i: Interview) => void;
}) {
  const dayInterviews = interviews.filter((i) => i.scheduledDate === date);
  const hours = Array.from({ length: 22 - 8 + 1 }, (_, i) => 8 + i); // 08..22

  const cellMap = new Map<string, Interview[]>();
  for (const i of dayInterviews) {
    const h = Number(i.scheduledTime.slice(0, 2));
    const key = `${i.sellerId}|${h}`;
    const arr = cellMap.get(key) ?? [];
    arr.push(i);
    cellMap.set(key, arr);
  }

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-bold">Grade por horário · 08h–22h</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-input border border-border rounded-lg px-2 py-1 text-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-card text-left px-3 py-2 w-16 font-mono text-muted-foreground uppercase tracking-wider">Hora</th>
              {sellers.map((s) => (
                <th key={s.id} className="text-left px-3 py-2 min-w-[140px] font-display">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h} className="border-b border-border/40">
                <td className="sticky left-0 bg-card px-3 py-2 font-mono text-muted-foreground tabular-nums">
                  {String(h).padStart(2, "0")}:00
                </td>
                {sellers.map((s) => {
                  const list = cellMap.get(`${s.id}|${h}`) ?? [];
                  return (
                    <td key={s.id} className="px-2 py-1 align-top">
                      {list.length === 0 ? (
                        <span className="text-muted-foreground/40">·</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {list.map((i) => (
                            <button
                              key={i.id}
                              onClick={() => onPick(i)}
                              className="text-left rounded-md border border-border bg-background/40 px-2 py-1 hover:bg-secondary/40"
                              title={i.notes ?? ""}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground">{i.scheduledTime}</span>
                                <InterviewStatusBadge status={i.status} />
                              </div>
                              <div className="font-medium truncate">{i.leadName}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function _statusFilterOptions(s: InterviewStatus) {
  return s;
}
