import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AuthBar } from "@/components/AuthBar";
import { fetchSellers } from "@/lib/storage";
import {
  COMMISSION_RATE,
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
} from "@/lib/enrollments";
import { EnrollmentFormDialog } from "@/components/EnrollmentFormDialog";
import { MaterialProgressBar } from "@/components/MaterialProgressBar";

export const Route = createFileRoute("/minhas-comissoes")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: MinhasComissoes,
  head: () => ({
    meta: [
      { title: "Minhas Comissões — Arena United" },
      { name: "description", content: "Cadastre matrículas e acompanhe sua comissão e premiação." },
    ],
  }),
});

function MinhasComissoes() {
  const { loading: loadingUser, role, sellerId, userId, email } = useCurrentUser();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [sellerRole, setSellerRole] = useState<SellerRole | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [creating, setCreating] = useState(false);

  const range = useMemo(() => getPeriodRange(period), [period]);

  useEffect(() => {
    if (!sellerId) return;
    fetchSellers()
      .then((all) => {
        const me = all.find((s) => s.id === sellerId);
        setSellerName(me?.name ?? null);
        setSellerRole((me?.role as SellerRole) ?? "consultor");
      })
      .catch(console.error);
  }, [sellerId]);

  const reload = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const data = await fetchEnrollments({
        sellerId,
        from: range.from,
        to: range.to,
      });
      setEnrollments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, range.from, range.to]);

  const totals = useMemo(() => {
    const approved = enrollments.filter((e) => e.status === "approved");
    const pending = enrollments.filter((e) => e.status === "pending");
    const totalEnroll = approved.reduce((a, e) => a + e.enrollmentValue, 0);
    const totalMonthly = approved.reduce((a, e) => a + e.monthlyFee, 0);
    const totalMaterial = approved.reduce((a, e) => a + e.materialValue, 0);
    const totalCommission = approved.reduce((a, e) => a + e.commissionAmount, 0);
    return {
      count: approved.length,
      pendingCount: pending.length,
      totalEnroll,
      totalMonthly,
      totalMaterial,
      totalCommission,
      avgEnroll: approved.length ? totalEnroll / approved.length : 0,
      avgMonthly: approved.length ? totalMonthly / approved.length : 0,
    };
  }, [enrollments]);

  const progress = useMemo(
    () => computeMaterialAward(sellerRole ?? "consultor", totals.totalMaterial),
    [sellerRole, totals.totalMaterial],
  );

  const totalToReceive = totals.totalCommission + progress.award;

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
        <Header role={role} email={email} userId={userId} />
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Seu usuário ainda não está vinculado a um vendedor. Peça ao administrador para fazer o vínculo.
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

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-8 py-8">
      <Header role={role} email={email} userId={userId} />

      <section className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl">Minhas Comissões</h1>
          <p className="text-sm text-muted-foreground">
            {sellerName ?? "—"} ·{" "}
            <strong>{sellerRole ? ROLE_LABELS[sellerRole] : "—"}</strong> · Comissão{" "}
            {sellerRole ? `${Math.round(COMMISSION_RATE[sellerRole] * 100)}%` : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
          >
            <Plus className="size-4" /> Nova matrícula
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-primary/10 to-transparent p-6 mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Trophy className="size-3.5" /> Total previsto a receber ({range.label})
        </div>
        <div className="font-display font-black text-4xl md:text-5xl tabular-nums">
          {formatBRL(totalToReceive)}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Comissão {formatBRL(totals.totalCommission)} + Premiação {formatBRL(progress.award)}
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card
          label="Matrículas aprovadas"
          value={String(totals.count)}
          hint={totals.pendingCount ? `${totals.pendingCount} aguardando aprovação` : undefined}
        />
        <Card label="Valor de matrículas" value={formatBRL(totals.totalEnroll)} accent />
        <Card label="Material acumulado" value={formatBRL(totals.totalMaterial)} accent />
        <Card label="Comissão prevista" value={formatBRL(totals.totalCommission)} accent />
        <Card label="Premiação de material" value={formatBRL(progress.award)} accent />
        <Card
          label="Mensalidades geradas"
          value={formatBRL(totals.totalMonthly)}
          hint="Indicador gerencial (não entra na comissão)"
        />
        <Card label="Ticket médio matrícula" value={formatBRL(totals.avgEnroll)} />
        <Card label="Ticket médio mensalidade" value={formatBRL(totals.avgMonthly)} />
      </section>

      <div className="mb-6">
        <MaterialProgressBar progress={progress} />
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Matrículas do período</h2>
          <span className="text-xs font-mono text-muted-foreground">
            {enrollments.length} item(s)
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : enrollments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma matrícula registrada neste período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2">Data</th>
                  <th className="text-left px-4 py-2">Aluno</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Matrícula</th>
                  <th className="text-right px-4 py-2">Mensalidade</th>
                  <th className="text-right px-4 py-2">Material</th>
                  <th className="text-right px-4 py-2">Comissão</th>
                  <th className="text-left px-4 py-2">Obs.</th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-2 font-mono">{e.enrollmentDate}</td>
                    <td className="px-4 py-2 font-medium">{e.studentName}</td>
                    <td className="px-4 py-2"><StatusBadge status={e.status} reason={e.rejectionReason} /></td>
                    <td className="px-4 py-2 text-right font-mono">{formatBRL(e.enrollmentValue)}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatBRL(e.monthlyFee)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatBRL(e.materialValue)}</td>
                    <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatBRL(e.commissionAmount)}</td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate" title={e.notes ?? ""}>{e.notes ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setCreating(false); setEditing(e); }} className="p-1.5 rounded-md bg-secondary hover:bg-secondary/70" title="Editar">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25" title="Excluir">
                          <Trash2 className="size-3.5" />
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

      <EnrollmentFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing}
        defaultSellerId={sellerId}
        canEditAll={false}
        currentRole={sellerRole}
        currentSellerName={sellerName}
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
        <Link to="/minha-programacao" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">Minha Programação</Link>
        {(role === "admin" || role === "diretor") && (
          <Link to="/comissoes-equipe" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
            {role === "diretor" ? "Comissões da Minha Equipe" : "Comissões da Equipe"}
          </Link>
        )}
        <AuthBar role={role} email={email} userId={userId} />
      </div>
    </header>
  );
}

export function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (k: PeriodKey) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PeriodKey)}
      className="bg-input rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="today">Hoje</option>
      <option value="week">Esta semana</option>
      <option value="month">Este mês</option>
      <option value="lastMonth">Mês anterior</option>
    </select>
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
