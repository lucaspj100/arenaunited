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
  createInterview,
  deleteInterview,
  fetchInterviews,
  todayISO,
  tomorrowISO,
  updateInterview,
} from "@/lib/interviews";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, Pencil, Plus, Trophy } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/minha-programacao")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: MinhaProgramacao,
  head: () => ({
    meta: [
      { title: "Minha Programação — Arena United" },
      { name: "description", content: "Agenda individual de entrevistas do vendedor." },
    ],
  }),
});

function MinhaProgramacao() {
  const { loading: loadingUser, role, sellerId, userId, email } = useCurrentUser();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [creating, setCreating] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const reload = async (sid: string) => {
    setLoading(true);
    try {
      const data = await fetchInterviews({ sellerId: sid });
      setInterviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) reload(sellerId);
  }, [sellerId]);

  const today = todayISO();
  const tomorrow = tomorrowISO();

  const todays = useMemo(
    () => interviews.filter((i) => i.scheduledDate === today),
    [interviews, today],
  );
  const tomorrows = useMemo(
    () => interviews.filter((i) => i.scheduledDate === tomorrow),
    [interviews, tomorrow],
  );

  const interviewsByDate = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const i of interviews) {
      const arr = map.get(i.scheduledDate) ?? [];
      arr.push(i);
      map.set(i.scheduledDate, arr);
    }
    return map;
  }, [interviews]);

  const selectedItems = useMemo(
    () => (selectedDate ? (interviewsByDate.get(selectedDate) ?? []) : []),
    [interviewsByDate, selectedDate],
  );

  const countByStatus = (list: Interview[], filter: (i: Interview) => boolean) =>
    list.filter(filter).length;

  const cards = [
    {
      label: "Marcadas hoje",
      value: todays.length,
      icon: CalendarDays,
      accent: "from-primary/20",
    },
    {
      label: "Realizadas hoje",
      value: countByStatus(todays, (i) => i.status === "realizada" || i.status === "fechada"),
      icon: CheckCircle2,
      accent: "from-accent/20",
    },
    {
      label: "Matrículas hoje",
      value: countByStatus(todays, (i) => i.status === "fechada"),
      icon: Trophy,
      accent: "from-gold/20",
    },
    {
      label: "Marcadas amanhã",
      value: tomorrows.length,
      icon: CalendarDays,
      accent: "from-bronze/20",
    },
  ];

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  if (!sellerId) {
    return (
      <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
        <PageHeader role={role} email={email} userId={userId} />
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Seu usuário ainda não está vinculado a um vendedor. Peça ao administrador para fazer o
          vínculo na tela de ranking.
        </div>
      </main>
    );
  }

  const handleSave = async (input: InterviewInput) => {
    if (editing) {
      await updateInterview(editing.id, input);
    } else {
      await createInterview(input);
    }
    await reload(sellerId);
  };

  const canEditAll =
    role === "admin" || role === "diretor" || role === "ceo" || role === "presidente";

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-8 py-8">
      <PageHeader role={role} email={email} userId={userId} />

      <section className="mt-8 mb-8">
        <h1 className="font-display font-black text-2xl md:text-3xl mb-1">Minha Programação</h1>
        <p className="text-sm text-muted-foreground">Sua agenda pessoal de entrevistas.</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border border-border p-4 bg-gradient-to-br ${c.accent} to-transparent bg-card`}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <c.icon className="size-3.5" /> {c.label}
            </div>
            <div className="font-display font-black text-3xl tabular-nums">{c.value}</div>
          </div>
        ))}
      </section>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Agenda</h2>
        <button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
        >
          <Plus className="size-4" /> Adicionar entrevista
        </button>
      </div>

      <AgendaTable
        title="Agenda de Hoje"
        items={todays}
        loading={loading}
        canEditAll={canEditAll}
        onEdit={(i) => {
          setCreating(false);
          setEditing(i);
        }}
        onDelete={canEditAll ? async (id) => { await deleteInterview(id); await reload(sellerId); } : undefined}
        emptyHint="Nenhuma entrevista para hoje."
      />

      <div className="h-6" />

      <AgendaTable
        title="Agenda de Amanhã"
        items={tomorrows}
        loading={loading}
        canEditAll={canEditAll}
        onEdit={(i) => {
          setCreating(false);
          setEditing(i);
        }}
        onDelete={canEditAll ? async (id) => { await deleteInterview(id); await reload(sellerId); } : undefined}
        emptyHint="Nenhuma entrevista para amanhã."
      />

      <div className="h-8" />

      <MonthCalendar
        month={calendarMonth}
        onPrev={() => setCalendarMonth((m) => addMonths(m, -1))}
        onNext={() => setCalendarMonth((m) => addMonths(m, 1))}
        onToday={() => {
          setCalendarMonth(startOfMonth(new Date()));
          setSelectedDate(todayISO());
        }}
        interviewsByDate={interviewsByDate}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {selectedDate && (
        <>
          <div className="h-6" />
          <AgendaTable
            title={`Agenda de ${format(new Date(`${selectedDate}T00:00:00`), "dd 'de' MMMM", { locale: ptBR })}`}
            items={selectedItems}
            loading={loading}
            canEditAll={canEditAll}
            onEdit={(i) => {
              setCreating(false);
              setEditing(i);
            }}
            onDelete={
              canEditAll
                ? async (id) => {
                    await deleteInterview(id);
                    await reload(sellerId);
                  }
                : undefined
            }
            emptyHint="Nenhuma entrevista neste dia."
          />
        </>
      )}

      <InterviewFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing}
        defaultSellerId={sellerId}
        canEditAll={canEditAll}
        onSave={handleSave}
      />
    </main>
  );
}

function PageHeader({
  role,
  email,
  userId,
}: {
  role: ReturnType<typeof useCurrentUser>["role"];
  email: string | null;
  userId: string | null;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Ranking
      </Link>
      <div className="flex items-center gap-2">
        {(role === "admin" || role === "diretor" || role === "ceo" || role === "presidente") && (
          <Link
            to="/agenda-equipe"
            className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            Agenda da Equipe
          </Link>
        )}
        <AuthBar role={role} email={email} userId={userId} />
      </div>
    </header>
  );
}

function AgendaTable({
  title,
  items,
  loading,
  canEditAll,
  onEdit,
  onDelete,
  emptyHint,
}: {
  title: string;
  items: Interview[];
  loading: boolean;
  canEditAll: boolean;
  onEdit: (i: Interview) => void;
  onDelete?: (id: string) => void | Promise<void>;
  emptyHint: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground font-mono">{items.length} item(s)</span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{emptyHint}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 w-16">Hora</th>
                <th className="text-left px-4 py-2">Lead</th>
                <th className="text-left px-4 py-2">Telefone</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Observações</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-2 font-mono tabular-nums">{i.scheduledTime}</td>
                  <td className="px-4 py-2 font-medium">{i.leadName}</td>
                  <td className="px-4 py-2 text-muted-foreground">{i.leadPhone ?? "—"}</td>
                  <td className="px-4 py-2"><InterviewStatusBadge status={i.status} /></td>
                  <td className="px-4 py-2 text-muted-foreground max-w-[260px] truncate" title={i.notes ?? ""}>
                    {i.notes ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => onEdit(i)}
                        className="p-1.5 rounded-md bg-secondary hover:bg-secondary/70"
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      {canEditAll && onDelete && (
                        <button
                          onClick={() => {
                            if (confirm("Excluir esta entrevista?")) onDelete(i.id);
                          }}
                          className="p-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25"
                          title="Excluir"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MonthCalendar({
  month,
  onPrev,
  onNext,
  onToday,
  interviewsByDate,
  selectedDate,
  onSelectDate,
}: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  interviewsByDate: Map<string, Interview[]>;
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    days.push(d);
  }
  const weekHeader = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <h3 className="font-display font-bold capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onToday}
            className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            Hoje
          </button>
          <button
            onClick={onPrev}
            className="p-1.5 rounded-md bg-secondary hover:bg-secondary/70"
            title="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={onNext}
            className="p-1.5 rounded-md bg-secondary hover:bg-secondary/70"
            title="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="p-2 md:p-3">
        <div className="grid grid-cols-7 gap-1 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-mono text-center">
          {weekHeader.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const items = interviewsByDate.get(iso) ?? [];
            const inMonth = isSameMonth(d, month);
            const isSel = selectedDate === iso;
            const today = isToday(d);
            const fechadas = items.filter((i) => i.status === "fechada").length;
            return (
              <button
                key={iso}
                onClick={() => onSelectDate(iso)}
                className={[
                  "min-h-[60px] md:min-h-[72px] rounded-lg border p-1.5 text-left transition flex flex-col gap-1",
                  inMonth ? "bg-background/40" : "bg-background/10 opacity-50",
                  isSel
                    ? "border-primary ring-2 ring-primary/40"
                    : today
                      ? "border-primary/60"
                      : "border-border hover:border-primary/40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono tabular-nums ${today ? "text-primary font-bold" : ""}`}
                  >
                    {format(d, "d")}
                  </span>
                  {items.length > 0 && (
                    <span className="text-[10px] font-mono px-1 rounded bg-primary/20 text-primary">
                      {items.length}
                    </span>
                  )}
                </div>
                {fechadas > 0 && (
                  <span className="text-[10px] font-mono text-gold flex items-center gap-1">
                    <Trophy className="size-2.5" /> {fechadas}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Clique em um dia para ver e editar as entrevistas dele.
        </p>
      </div>
    </section>
  );
}
