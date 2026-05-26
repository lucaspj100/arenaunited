import { Seller, conversionRate, MIN_WEEK_INTERVIEWS_FOR_CONVERSION, rankBy } from "@/lib/ranking";
import { CalendarCheck, UserCheck, Target } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

type CardSpec = {
  title: string;
  subtitle: string;
  icon: typeof CalendarCheck;
  accent: string;
  format: (v: number) => string;
  items: { id: string; name: string; avatar?: string | null; metric: number }[];
  emptyHint: string;
};

export function WeeklyCompetitions({ sellers }: { sellers: Seller[] }) {
  const scheduled = rankBy(sellers, (s) => s.weekScheduled).filter((s) => s.metric > 0);
  const completed = rankBy(sellers, (s) => s.weekCompleted).filter((s) => s.metric > 0);
  const conversion = rankBy(
    sellers,
    (s) => conversionRate(s),
    (s) => s.weekCompleted >= MIN_WEEK_INTERVIEWS_FOR_CONVERSION,
  ).filter((s) => s.metric > 0);

  const cards: CardSpec[] = [
    {
      title: "Agenda Cheia da Semana",
      subtitle: "Quem mais marcou entrevistas",
      icon: CalendarCheck,
      accent: "from-primary/30 to-transparent border-primary/40",
      format: (v) => `${v}`,
      items: scheduled,
      emptyHint: "Nenhuma entrevista agendada esta semana.",
    },
    {
      title: "Presença Confirmada",
      subtitle: "Quem mais realizou entrevistas",
      icon: UserCheck,
      accent: "from-accent/25 to-transparent border-accent/40",
      format: (v) => `${v}`,
      items: completed,
      emptyHint: "Nenhuma entrevista realizada esta semana.",
    },
    {
      title: "Conversão de Elite",
      subtitle: `Melhor taxa entrevista → matrícula · mín. ${MIN_WEEK_INTERVIEWS_FOR_CONVERSION} realizadas`,
      icon: Target,
      accent: "from-gold/25 to-transparent border-gold/40",
      format: (v) => `${v.toFixed(1).replace(".", ",")}%`,
      items: conversion,
      emptyHint: `Ninguém atingiu ${MIN_WEEK_INTERVIEWS_FOR_CONVERSION} entrevistas ainda.`,
    },
  ];

  return (
    <section className="mb-12">
      <h2 className="font-display font-black text-xl mb-6 flex items-center gap-2 uppercase tracking-wide">
        <span className="text-accent">⚡</span> Competições da Semana
      </h2>
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <CompCard key={c.title} {...c} />
        ))}
      </div>
    </section>
  );
}

function CompCard({ title, subtitle, icon: Icon, accent, format, items, emptyHint }: CardSpec) {
  const top = items.slice(0, 5);
  const leader = top[0];
  return (
    <div className={`rounded-2xl p-5 border bg-gradient-to-br ${accent} bg-card flex flex-col`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="size-10 rounded-xl bg-background/50 border border-border flex items-center justify-center shrink-0">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold leading-tight truncate">{title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
        </div>
      </div>

      {leader ? (
        <>
          <div className="rounded-xl bg-background/40 border border-border p-3 mb-3 flex items-center gap-3">
            <div className="size-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-display font-bold text-sm shrink-0">
              {leader.avatar ? (
                <img src={leader.avatar} alt={leader.name} className="size-full object-cover" />
              ) : (
                initials(leader.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Líder
              </div>
              <div className="font-display font-bold truncate">{leader.name}</div>
            </div>
            <div className="font-mono font-black text-xl text-primary tabular-nums">
              {format(leader.metric)}
            </div>
          </div>

          <ol className="space-y-1.5">
            {top.slice(1).map((s, i) => (
              <li
                key={s.id}
                className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-background/40"
              >
                <span className="font-mono text-xs text-muted-foreground w-5">{i + 2}º</span>
                <span className="truncate flex-1">{s.name}</span>
                <span className="font-mono tabular-nums text-foreground/80">
                  {format(s.metric)}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
          {emptyHint}
        </div>
      )}
    </div>
  );
}
