import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Users,
  Target,
  TrendingUp,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getAccessibleSellerIds } from "@/lib/access";
import { fetchSellers } from "@/lib/storage";
import { fetchEnrollments, type Enrollment } from "@/lib/enrollments";
import { fetchInterviews, type Interview } from "@/lib/interviews";
import { getPeriodRange, type PeriodKey } from "@/lib/commissions";
import { PeriodPicker } from "@/components/PeriodPicker";
import { AuthBar } from "@/components/AuthBar";
import { formatBRL, type Seller } from "@/lib/ranking";
import { RitualDoDia } from "@/components/RitualDoDia";
import { SafeBlock } from "@/components/SafeBlock";
import { buildRitual } from "@/lib/ritual";

export const Route = createFileRoute("/meu-dashboard")({
  component: ManagerDashboard,
  head: () => ({
    meta: [{ title: "Meu Dashboard — Arena United" }],
  }),
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
        <Icon className="size-3.5 text-primary" /> {label}
      </div>
      <div className="mt-2 font-display font-black text-2xl">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function ManagerDashboard() {
  const { loading, userId, sellerId, email, role, isFranchisee, isDirectorLike, isStaff } =
    useCurrentUser();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState(() => {
    const t = todayISO();
    return { from: t, to: t };
  });
  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);

  const [teamIds, setTeamIds] = useState<string[] | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      navigate({ to: "/login" });
      return;
    }
    if (!isFranchisee && !isDirectorLike && !isStaff) {
      navigate({ to: "/" });
    }
  }, [loading, userId, isFranchisee, isDirectorLike, isStaff, navigate]);

  // Carrega vendedores e ids da equipe
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ids, all] = await Promise.all([
          getAccessibleSellerIds(),
          fetchSellers(),
        ]);
        if (!mounted) return;
        setTeamIds(ids);
        setSellers(all);
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : "Erro ao carregar equipe.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Carrega entrevistas/matrículas no período (sem filtro de seller — RLS já restringe)
  useEffect(() => {
    let mounted = true;
    setLoadingData(true);
    Promise.all([
      fetchEnrollments({ from: range.from, to: range.to, status: "approved" }),
      fetchInterviews({ from: range.from, to: range.to }),
    ])
      .then(([e, i]) => {
        if (!mounted) return;
        setEnrollments(e);
        setInterviews(i);
      })
      .catch((e) => mounted && setErr(e.message))
      .finally(() => mounted && setLoadingData(false));
    return () => {
      mounted = false;
    };
  }, [range.from, range.to]);

  const teamSellers = useMemo(() => {
    if (teamIds === null) return sellers; // staff vê tudo
    const set = new Set(teamIds);
    return sellers.filter((s) => set.has(s.id));
  }, [sellers, teamIds]);

  const teamSellerIds = useMemo(
    () => new Set(teamSellers.map((s) => s.id)),
    [teamSellers],
  );

  const teamEnrollments = useMemo(
    () => enrollments.filter((e) => teamSellerIds.has(e.sellerId)),
    [enrollments, teamSellerIds],
  );
  const teamInterviews = useMemo(
    () => interviews.filter((i) => teamSellerIds.has(i.sellerId)),
    [interviews, teamSellerIds],
  );

  const totals = useMemo(() => {
    const deals = teamEnrollments.length;
    const material = teamEnrollments.reduce((acc, e) => acc + (e.materialValue || 0), 0);
    const monthlyFee = teamEnrollments.reduce((acc, e) => acc + (e.monthlyFee || 0), 0);
    const enrollVal = teamEnrollments.reduce((acc, e) => acc + (e.enrollmentValue || 0), 0);
    const ticket = deals > 0 ? enrollVal / deals : 0;
    const scheduled = teamInterviews.length;
    const completed = teamInterviews.filter(
      (i) => i.status === "realizada" || i.status === "fechada",
    ).length;
    const conversion = completed > 0 ? (deals / completed) * 100 : 0;
    return { deals, material, monthlyFee, ticket, scheduled, completed, conversion };
  }, [teamEnrollments, teamInterviews]);

  const perSeller = useMemo(() => {
    const map = new Map<
      string,
      { deals: number; material: number; scheduled: number; completed: number }
    >();
    for (const s of teamSellers) {
      map.set(s.id, { deals: 0, material: 0, scheduled: 0, completed: 0 });
    }
    for (const e of teamEnrollments) {
      const r = map.get(e.sellerId);
      if (r) {
        r.deals += 1;
        r.material += e.materialValue || 0;
      }
    }
    for (const i of teamInterviews) {
      const r = map.get(i.sellerId);
      if (r) {
        r.scheduled += 1;
        if (i.status === "realizada" || i.status === "fechada") r.completed += 1;
      }
    }
    return teamSellers
      .map((s) => ({ seller: s, ...(map.get(s.id) ?? { deals: 0, material: 0, scheduled: 0, completed: 0 }) }))
      .sort((a, b) => b.deals - a.deals || b.material - a.material);
  }, [teamSellers, teamEnrollments, teamInterviews]);

  // Dados pessoais (se o gestor estiver no ranking)
  const me = useMemo(
    () => (sellerId ? sellers.find((s) => s.id === sellerId) ?? null : null),
    [sellers, sellerId],
  );
  const myStats = useMemo(() => {
    if (!sellerId) return null;
    const mine = enrollments.filter((e) => e.sellerId === sellerId);
    const myInt = interviews.filter((i) => i.sellerId === sellerId);
    const deals = mine.length;
    const material = mine.reduce((a, e) => a + (e.materialValue || 0), 0);
    const completed = myInt.filter((i) => i.status === "realizada" || i.status === "fechada").length;
    const conversion = completed > 0 ? (deals / completed) * 100 : 0;
    return { deals, material, completed, scheduled: myInt.length, conversion };
  }, [sellerId, enrollments, interviews]);

  const ritual = useMemo(() => {
    if (!me) return null;
    try {
      return buildRitual({
        seller: me,
        tier: "neutral",
        enrollments60d: enrollments.filter((e) => e.sellerId === me.id),
        interviews60d: interviews.filter((i) => i.sellerId === me.id),
      });
    } catch {
      return null;
    }
  }, [me, enrollments, interviews]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            <ArrowLeft className="size-3.5" /> Início
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-bronze flex items-center justify-center">
              <Trophy className="size-4 text-primary-foreground" />
            </div>
            <h1 className="font-display font-black text-xl">Meu Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/equipe"
            className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            Equipe
          </Link>
          <Link
            to="/agenda-equipe"
            className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            Agenda
          </Link>
          <Link
            to="/perfil"
            className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            Meu Perfil
          </Link>
          <AuthBar role={role} email={email} userId={userId} />
        </div>
      </header>

      <div className="flex justify-end mb-6">
        <PeriodPicker
          value={period}
          custom={custom}
          onChange={(k, c) => {
            setPeriod(k);
            setCustom(c);
          }}
        />
      </div>

      {err && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* Pessoal */}
      {me && myStats && (
        <section className="mb-8">
          <h2 className="font-display font-bold text-sm uppercase text-muted-foreground tracking-wider mb-3">
            Meus números no período
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Matrículas"
              value={String(myStats.deals)}
              hint={`Meta: ${me.goalDeals}`}
              icon={GraduationCap}
            />
            <KpiCard
              label="Material"
              value={formatBRL(myStats.material)}
              hint={`Meta: ${formatBRL(me.goalMaterial)}`}
              icon={Target}
            />
            <KpiCard
              label="Entrevistas realizadas"
              value={`${myStats.completed}/${myStats.scheduled}`}
              icon={CalendarDays}
            />
            <KpiCard
              label="Conversão"
              value={`${Math.round(myStats.conversion)}%`}
              hint="Matrículas ÷ realizadas"
              icon={TrendingUp}
            />
          </div>
        </section>
      )}

      {/* Equipe */}
      <section className="mb-8">
        <h2 className="font-display font-bold text-sm uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
          <Users className="size-4" /> Resultados da equipe ({teamSellers.length} pessoas)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Matrículas" value={String(totals.deals)} icon={GraduationCap} />
          <KpiCard label="Material vendido" value={formatBRL(totals.material)} icon={Target} />
          <KpiCard
            label="Entrevistas"
            value={`${totals.completed}/${totals.scheduled}`}
            hint="Realizadas / marcadas"
            icon={CalendarDays}
          />
          <KpiCard
            label="Conversão"
            value={`${Math.round(totals.conversion)}%`}
            hint={`Ticket médio ${formatBRL(totals.ticket)}`}
            icon={TrendingUp}
          />
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-bold text-sm">Ranking da minha equipe</h3>
            {loadingData && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Vendedor</th>
                <th className="px-4 py-2 text-right">Matrículas</th>
                <th className="px-4 py-2 text-right">Material</th>
                <th className="px-4 py-2 text-right">Entrev.</th>
                <th className="px-4 py-2 text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {perSeller.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-xs">
                    Nenhum vendedor na equipe ainda.
                  </td>
                </tr>
              )}
              {perSeller.map((row, idx) => {
                const conv = row.completed > 0 ? (row.deals / row.completed) * 100 : 0;
                return (
                  <tr key={row.seller.id} className="border-t border-border/60">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 font-semibold">{row.seller.name}</td>
                    <td className="px-4 py-2 text-right">{row.deals}</td>
                    <td className="px-4 py-2 text-right">{formatBRL(row.material)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {row.completed}/{row.scheduled}
                    </td>
                    <td className="px-4 py-2 text-right">{Math.round(conv)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {ritual && (
        <section>
          <h2 className="font-display font-bold text-sm uppercase text-muted-foreground tracking-wider mb-3">
            Meu ritual do dia
          </h2>
          <SafeBlock name="RitualDoDia">
            <RitualDoDia plan={ritual} />
          </SafeBlock>
        </section>
      )}
    </main>
  );
}