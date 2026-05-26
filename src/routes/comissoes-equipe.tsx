import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AuthBar } from "@/components/AuthBar";
import { fetchSellers } from "@/lib/storage";
import { Seller } from "@/lib/ranking";
import {
  PeriodKey,
  ROLE_LABELS,
  SellerRole,
  computeMaterialAward,
  formatBRL,
  getPeriodRange,
} from "@/lib/commissions";
import {
  Enrollment,
  EnrollmentInput,
  createEnrollment,
  deleteEnrollment,
  fetchEnrollments,
  updateEnrollment,
  setEnrollmentStatus,
} from "@/lib/enrollments";
import { EnrollmentFormDialog } from "@/components/EnrollmentFormDialog";
import { PeriodSelector, StatusBadge } from "./minhas-comissoes";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/comissoes-equipe")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: ComissoesEquipe,
  head: () => ({
    meta: [
      { title: "Comissões da Equipe — Arena United" },
      { name: "description", content: "Dashboard administrativo de comissões e premiações da equipe." },
    ],
  }),
});

type AggRow = {
  sellerId: string;
  name: string;
  role: SellerRole;
  count: number;
  enroll: number;
  monthly: number;
  material: number;
  commission: number;
  award: number;
  total: number;
  avgEnroll: number;
  avgMonthly: number;
};

function ComissoesEquipe() {
  const { loading: loadingUser, role, userId, email } = useCurrentUser();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [sellerFilter, setSellerFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<"" | SellerRole>("");
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [creating, setCreating] = useState(false);

  const range = useMemo(() => getPeriodRange(period), [period]);

  const isAdmin = role === "admin";
  const isDirector = role === "diretor" || role === "ceo" || role === "presidente";

  const pendingCount = useMemo(
    () => enrollments.filter((e) => e.status === "pending").length,
    [enrollments],
  );

  const sortedEnrollments = useMemo(() => {
    const rank = { pending: 0, approved: 1, rejected: 2 } as const;
    return [...enrollments].sort((a, b) => rank[a.status] - rank[b.status]);
  }, [enrollments]);

  const reload = async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        fetchSellers(),
        fetchEnrollments({
          sellerId: sellerFilter || undefined,
          from: range.from,
          to: range.to,
        }),
      ]);
      // Diretor só vê seus próprios vendedores
      const scoped = isDirector ? s.filter((x) => x.directorId === userId) : s;
      setSellers(scoped);
      setEnrollments(e);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin || isDirector) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, sellerFilter, isAdmin, isDirector, userId]);

  const filteredSellers = useMemo(
    () => sellers.filter((s) => (roleFilter ? s.role === roleFilter : true)),
    [sellers, roleFilter],
  );

  const aggregates: AggRow[] = useMemo(() => {
    return filteredSellers.map((s) => {
      const list = enrollments.filter((e) => e.sellerId === s.id && e.status === "approved");
      const enroll = list.reduce((a, e) => a + e.enrollmentValue, 0);
      const monthly = list.reduce((a, e) => a + e.monthlyFee, 0);
      const material = list.reduce((a, e) => a + e.materialValue, 0);
      const commission = list.reduce((a, e) => a + e.commissionAmount, 0);
      const award = computeMaterialAward(s.role, material).award;
      return {
        sellerId: s.id,
        name: s.name,
        role: s.role,
        count: list.length,
        enroll,
        monthly,
        material,
        commission,
        award,
        total: commission + award,
        avgEnroll: list.length ? enroll / list.length : 0,
        avgMonthly: list.length ? monthly / list.length : 0,
      };
    });
  }, [filteredSellers, enrollments]);

  const team = useMemo(() => {
    return aggregates.reduce(
      (acc, r) => ({
        count: acc.count + r.count,
        enroll: acc.enroll + r.enroll,
        monthly: acc.monthly + r.monthly,
        material: acc.material + r.material,
        commission: acc.commission + r.commission,
        award: acc.award + r.award,
        total: acc.total + r.total,
      }),
      { count: 0, enroll: 0, monthly: 0, material: 0, commission: 0, award: 0, total: 0 },
    );
  }, [aggregates]);

  const avgEnrollTeam = team.count ? team.enroll / team.count : 0;
  const avgMonthlyTeam = team.count ? team.monthly / team.count : 0;

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  if (!isAdmin && !isDirector) {
    return (
      <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
        <Header role={role} email={email} userId={userId} />
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Acesso restrito a administrador ou diretor.
        </div>
      </main>
    );
  }

  const handleSave = async (input: EnrollmentInput) => {
    if (editing) await updateEnrollment(editing.id, input);
    else await createEnrollment(input);
    await reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta matrícula?")) return;
    await deleteEnrollment(id);
    await reload();
  };

  const handleApprove = async (id: string) => {
    try {
      await setEnrollmentStatus(id, "approved");
      await reload();
    } catch (err) {
      alert("Erro ao aprovar: " + ((err as Error)?.message ?? ""));
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Motivo da recusa (opcional):") ?? "";
    try {
      await setEnrollmentStatus(id, "rejected", reason || null);
      await reload();
    } catch (err) {
      alert("Erro ao recusar: " + ((err as Error)?.message ?? ""));
    }
  };

  const rankings: { title: string; key: keyof AggRow; format: (v: number) => string }[] = [
    { title: "Matrículas fechadas", key: "count", format: (v) => String(v) },
    { title: "Valor de matrículas", key: "enroll", format: formatBRL },
    { title: "Mensalidades geradas", key: "monthly", format: formatBRL },
    { title: "Material vendido", key: "material", format: formatBRL },
    { title: "Comissão prevista", key: "commission", format: formatBRL },
    { title: "Premiação de material", key: "award", format: formatBRL },
    { title: "Total previsto a receber", key: "total", format: formatBRL },
  ];

  const sellersForDialog = sellers.map((s) => ({ id: s.id, name: s.name, role: s.role }));

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 md:px-8 py-8">
      <Header role={role} email={email} userId={userId} />

      <section className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl">
            {isDirector ? "Comissões da Minha Equipe" : "Comissões da Equipe"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isDirector ? "Apenas vendedores sob sua direção" : "Visão consolidada"} · {range.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="bg-input rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos os vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "" | SellerRole)}
            className="bg-input rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos os cargos</option>
            <option value="consultor">Consultor</option>
            <option value="gerente">Gerente</option>
          </select>
          <button
            onClick={() => { setEditing(null); setCreating(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
          >
            <Plus className="size-4" /> Matrícula
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-primary/10 to-transparent p-6 mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Trophy className="size-3.5" /> Total geral previsto a pagar
        </div>
        <div className="font-display font-black text-4xl md:text-5xl tabular-nums">
          {formatBRL(team.total)}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Comissão {formatBRL(team.commission)} + Premiação {formatBRL(team.award)}
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card label="Matrículas" value={String(team.count)} />
        <Card label="Valor de matrículas" value={formatBRL(team.enroll)} accent />
        <Card label="Material vendido" value={formatBRL(team.material)} accent />
        <Card label="Comissão prevista" value={formatBRL(team.commission)} accent />
        <Card label="Premiação prevista" value={formatBRL(team.award)} accent />
        <Card label="Mensalidades geradas" value={formatBRL(team.monthly)} hint="Indicador gerencial" />
        <Card label="Ticket médio matrícula" value={formatBRL(avgEnrollTeam)} />
        <Card label="Ticket médio mensalidade" value={formatBRL(avgMonthlyTeam)} />
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-display font-bold">Por vendedor</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : aggregates.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Sem dados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2">Vendedor</th>
                  <th className="text-left px-4 py-2">Cargo</th>
                  <th className="text-right px-4 py-2">Matr.</th>
                  <th className="text-right px-4 py-2">R$ Matr.</th>
                  <th className="text-right px-4 py-2">Mensal.</th>
                  <th className="text-right px-4 py-2">Material</th>
                  <th className="text-right px-4 py-2">Comissão</th>
                  <th className="text-right px-4 py-2">Premiação</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="text-right px-4 py-2">Tkt. Matr.</th>
                  <th className="text-right px-4 py-2">Tkt. Mensal.</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((r) => (
                  <tr key={r.sellerId} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-xs">{ROLE_LABELS[r.role]}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.count}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatBRL(r.enroll)}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatBRL(r.monthly)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatBRL(r.material)}</td>
                    <td className="px-4 py-2 text-right font-mono text-primary">{formatBRL(r.commission)}</td>
                    <td className="px-4 py-2 text-right font-mono text-gold">{formatBRL(r.award)}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">{formatBRL(r.total)}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatBRL(r.avgEnroll)}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatBRL(r.avgMonthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {rankings.map((r) => {
          const sorted = [...aggregates].sort((a, b) => (b[r.key] as number) - (a[r.key] as number)).slice(0, 5);
          return (
            <div key={r.title} className="rounded-2xl border border-border bg-card p-4">
              <div className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <Trophy className="size-4 text-gold" /> {r.title}
              </div>
              <ol className="space-y-1.5">
                {sorted.map((row, i) => (
                  <li key={row.sellerId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`size-5 rounded-md text-[10px] flex items-center justify-center font-bold ${i === 0 ? "bg-gold text-background" : i === 1 ? "bg-secondary" : i === 2 ? "bg-bronze/30" : "bg-secondary/50"}`}>{i + 1}</span>
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="font-mono tabular-nums">{r.format(row[r.key] as number)}</span>
                  </li>
                ))}
                {sorted.length === 0 && (
                  <li className="text-xs text-muted-foreground text-center py-2">Sem dados</li>
                )}
              </ol>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Matrículas do período</h2>
          <span className="text-xs font-mono text-muted-foreground">
            {enrollments.length} item(s){pendingCount > 0 && <span className="ml-2 text-gold">· {pendingCount} pendente(s)</span>}
          </span>
        </div>
        {enrollments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma matrícula.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2">Data</th>
                  <th className="text-left px-4 py-2">Vendedor</th>
                  <th className="text-left px-4 py-2">Aluno</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Matr.</th>
                  <th className="text-right px-4 py-2">Mensal.</th>
                  <th className="text-right px-4 py-2">Material</th>
                  <th className="text-right px-4 py-2">Comissão</th>
                  <th className="px-4 py-2 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {sortedEnrollments.map((e) => {
                  const s = sellers.find((x) => x.id === e.sellerId);
                  return (
                    <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-2 font-mono">{e.enrollmentDate}</td>
                      <td className="px-4 py-2">{s?.name ?? "—"}</td>
                      <td className="px-4 py-2 font-medium">{e.studentName}</td>
                      <td className="px-4 py-2"><StatusBadge status={e.status} reason={e.rejectionReason} /></td>
                      <td className="px-4 py-2 text-right font-mono">{formatBRL(e.enrollmentValue)}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatBRL(e.monthlyFee)}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatBRL(e.materialValue)}</td>
                      <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatBRL(e.commissionAmount)}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-1">
                          {e.status === "pending" && (
                            <>
                              <button onClick={() => handleApprove(e.id)} className="p-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25" title="Aprovar"><Check className="size-3.5" /></button>
                              <button onClick={() => handleReject(e.id)} className="p-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25" title="Recusar"><X className="size-3.5" /></button>
                            </>
                          )}
                          <button onClick={() => { setCreating(false); setEditing(e); }} className="p-1.5 rounded-md bg-secondary hover:bg-secondary/70"><Pencil className="size-3.5" /></button>
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25"><Trash2 className="size-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EnrollmentFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing}
        sellers={sellersForDialog}
        canEditAll
        onSave={handleSave}
      />
    </main>
  );
}

function Header({
  role, email, userId,
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
        <Link to="/agenda-equipe" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">Agenda da Equipe</Link>
        <AuthBar role={role} email={email} userId={userId} />
      </div>
    </header>
  );
}

function Card({
  label, value, accent, hint,
}: { label: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? "bg-gradient-to-br from-primary/10 to-transparent border-primary/30" : "bg-card border-border"}`}>
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="font-display font-bold text-lg md:text-xl tabular-nums truncate">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{hint}</div>}
    </div>
  );
}
