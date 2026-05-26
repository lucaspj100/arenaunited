import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Flame,
  Loader2,
  Plus,
  Users,
  GraduationCap,
  Crown,
  CalendarDays,
  UserPlus,
  Trash2,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AuthBar } from "@/components/AuthBar";
import { SellerRow } from "@/components/SellerRow";
import { Podium } from "@/components/Podium";
import { WeeklyCompetitions } from "@/components/WeeklyCompetitions";
import { EditSellerDialog } from "@/components/EditSellerDialog";
import { InterviewFormDialog } from "@/components/InterviewFormDialog";
import { InterviewStatusBadge } from "@/components/InterviewStatusBadge";
import {
  fetchSellers,
  insertSeller,
  updateSeller as updateSellerRow,
  deleteSellerRow,
  loadLocalConfig,
} from "@/lib/storage";
import { Seller, rankSellers, formatBRL, DEFAULT_GOALS } from "@/lib/ranking";
import { fetchEnrollments } from "@/lib/enrollments";
import {
  Interview,
  InterviewInput,
  createInterview,
  updateInterview,
  deleteInterview,
  fetchInterviews,
  weekRangeISO,
} from "@/lib/interviews";

export const Route = createFileRoute("/fanaticos")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: Fanaticos,
  head: () => ({
    meta: [
      { title: "Fanáticos — United Performance" },
      { name: "description", content: "Ranking exclusivo dos Fanáticos." },
    ],
  }),
});

function Fanaticos() {
  const { loading: loadingUser, role, userId, email } = useCurrentUser();
  const isAdmin = role === "admin";
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollAgg, setEnrollAgg] = useState<Record<string, { monthly: number; commission: number }>>({});
  const config = useMemo(() => loadLocalConfig(), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchSellers()
      .then((d) => mounted && setSellers(d))
      .catch(console.error)
      .finally(() => mounted && setLoading(false));
    const channel = supabase
      .channel("fanaticos-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, () => {
        fetchSellers().then((d) => mounted && setSellers(d)).catch(console.error);
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchEnrollments()
      .then((rows) => {
        const agg: Record<string, { monthly: number; commission: number }> = {};
        for (const r of rows) {
          const cur = agg[r.sellerId] ?? { monthly: 0, commission: 0 };
          cur.monthly += Number(r.monthlyFee) || 0;
          cur.commission += Number(r.commissionAmount) || 0;
          agg[r.sellerId] = cur;
        }
        setEnrollAgg(agg);
      })
      .catch(console.warn);
  }, [isAdmin]);

  const reloadInterviews = async () => {
    const week = weekRangeISO();
    try {
      const iv = await fetchInterviews({ from: week.start, to: week.end });
      setInterviews(iv);
    } catch (e) {
      console.warn("fanaticos interviews", e);
    }
  };

  useEffect(() => {
    reloadInterviews();
  }, []);

  const mySeller = useMemo(
    () => (userId ? sellers.find((s) => s.userId === userId) ?? null : null),
    [sellers, userId],
  );

  const isMemberSeller = role === "vendedor" && !!mySeller?.inMyTeam;
  const hasAccess = isAdmin || isMemberSeller;

  const fanaticos = useMemo(
    () => rankSellers(sellers.filter((s) => s.inMyTeam), config.weights),
    [sellers, config.weights],
  );

  const fanaticoIds = useMemo(() => new Set(fanaticos.map((s) => s.id)), [fanaticos]);
  const outsiders = useMemo(
    () => sellers.filter((s) => !s.inMyTeam).sort((a, b) => a.name.localeCompare(b.name)),
    [sellers],
  );
  const fanaticoInterviews = useMemo(
    () => interviews.filter((i) => fanaticoIds.has(i.sellerId)),
    [interviews, fanaticoIds],
  );
  const sellerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sellers) m.set(s.id, s.name);
    return m;
  }, [sellers]);

  const totalMaterial = fanaticos.reduce((a, s) => a + s.material, 0);
  const totalDeals = fanaticos.reduce((a, s) => a + s.deals, 0);

  const patchSeller = async (id: string, patch: Partial<Seller>) => {
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try {
      await updateSellerRow(id, patch);
    } catch (e) {
      console.error(e);
      alert("Não foi possível salvar: " + ((e as Error)?.message ?? "erro"));
      fetchSellers().then(setSellers).catch(console.error);
    }
  };

  const addFanatico = async (sellerId: string) => {
    await patchSeller(sellerId, { inMyTeam: true });
  };

  const removeFanatico = async (sellerId: string) => {
    if (!confirm("Remover este vendedor dos Fanáticos? Ele continua no ranking geral.")) return;
    await patchSeller(sellerId, { inMyTeam: false });
  };

  const createFanaticoSeller = async () => {
    const name = prompt("Nome do novo vendedor Fanático:");
    if (!name?.trim()) return;
    try {
      const created = await insertSeller({
        name: name.trim(),
        deals: 0,
        material: 0,
        goalDeals: DEFAULT_GOALS.deals,
        goalMaterial: DEFAULT_GOALS.material,
        sortIndex: sellers.length + 1,
        weekScheduled: 0,
        weekCompleted: 0,
        weekEnrollments: 0,
        userId: null,
        role: "consultor",
        inMyTeam: true,
      });
      setSellers((prev) => [...prev, created]);
      setEditingId(created.id);
    } catch (e) {
      console.error(e);
      alert("Erro ao criar vendedor.");
    }
  };

  const removeSeller = async (id: string) => {
    if (!confirm("Excluir definitivamente este vendedor?")) return;
    setSellers((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSellerRow(id);
    } catch (e) {
      console.error(e);
      alert("Erro ao remover vendedor.");
    }
  };

  const handleSaveInterview = async (input: InterviewInput) => {
    if (editingInterview) await updateInterview(editingInterview.id, input);
    else await createInterview(input);
    await reloadInterviews();
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm("Excluir esta entrevista?")) return;
    await deleteInterview(id);
    await reloadInterviews();
  };

  if (loadingUser || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
        <Header role={role} email={email} userId={userId} />
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Esse ranking é exclusivo para o time dos Fanáticos. Peça ao administrador para te incluir.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 md:px-8 py-8">
      <Header role={role} email={email} userId={userId} />

      <section className="mt-8 mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-gold mb-2">
          <Flame className="size-3.5" /> Ranking exclusivo
        </div>
        <h1 className="font-display font-black text-3xl md:text-5xl tracking-tight">
          Fan<span className="text-primary">áticos</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {fanaticos.length} vendedor(es) selecionado(s) pelo administrador. Eles também competem no ranking geral.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat icon={Users} label="Fanáticos ativos" value={String(fanaticos.length)} />
        <Stat icon={Flame} label="Material vendido" value={formatBRL(totalMaterial)} accent />
        <Stat icon={GraduationCap} label="Matrículas fechadas" value={String(totalDeals)} />
        <Stat
          icon={Crown}
          label="Líder Fanático"
          value={fanaticos[0]?.name ?? "—"}
          highlight={`${fanaticos[0]?.score ?? 0}%`}
          gold
        />
      </section>

      {fanaticos.length >= 3 && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <span className="text-gold">★</span> Top 3 Fanáticos
          </h2>
          <Podium top3={fanaticos.slice(0, 3)} />
        </section>
      )}

      {fanaticos.length > 0 && (
        <section className="mb-10">
          <WeeklyCompetitions sellers={fanaticos} />
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-display font-bold text-xl">Ranking dos Fanáticos</h2>
          {isAdmin && (
            <button
              onClick={createFanaticoSeller}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              <Plus className="size-4" /> Novo Fanático
            </button>
          )}
        </div>
        {fanaticos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            Nenhum vendedor faz parte dos Fanáticos ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {fanaticos.map((s, i) => {
              const extra = enrollAgg[s.id];
              return (
                <SellerRow
                  key={s.id}
                  seller={s}
                  rank={i + 1}
                  onChange={(patch) => patchSeller(s.id, patch)}
                  onDelete={() => removeSeller(s.id)}
                  onEdit={() => setEditingId(s.id)}
                  readOnly={!isAdmin}
                  showEditButton={isAdmin}
                  showFinancial={isAdmin}
                  monthlyFees={extra?.monthly ?? 0}
                  estimatedCommission={extra?.commission ?? 0}
                />
              );
            })}
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="size-4 text-gold" />
            <h2 className="font-display font-bold text-xl">Adicionar vendedores aos Fanáticos</h2>
          </div>
          {outsiders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl text-sm">
              Todos os vendedores cadastrados já são Fanáticos.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2">Vendedor</th>
                    <th className="text-left px-4 py-2">Cargo</th>
                    <th className="text-right px-4 py-2">Material</th>
                    <th className="text-right px-4 py-2">Matrículas</th>
                    <th className="px-4 py-2 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {outsiders.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-2 font-medium">{s.name}</td>
                      <td className="px-4 py-2 text-muted-foreground capitalize">{s.role}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{formatBRL(s.material)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{s.deals}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => addFanatico(s.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gold/15 border border-gold/40 text-gold text-xs font-semibold hover:bg-gold/25"
                        >
                          <Plus className="size-3" /> Fanático
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {fanaticos.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Remover dos Fanáticos
              </div>
              <ul className="divide-y divide-border/60">
                {fanaticos.map((s) => (
                  <li key={s.id} className="px-4 py-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <button
                      onClick={() => removeFanatico(s.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25"
                    >
                      <Trash2 className="size-3" /> Remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="font-display font-bold text-xl">Programação dos Fanáticos · esta semana</h2>
          </div>
          {isAdmin && fanaticos.length > 0 && (
            <button
              onClick={() => {
                setEditingInterview(null);
                setCreatingInterview(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
            >
              <Plus className="size-3.5" /> Nova entrevista
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {fanaticoInterviews.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma entrevista marcada para os Fanáticos nesta semana.
            </div>
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
                    {isAdmin && <th className="px-4 py-2 w-24"></th>}
                  </tr>
                </thead>
                <tbody>
                  {fanaticoInterviews.map((i) => (
                    <tr key={i.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-2 font-medium">{sellerNameById.get(i.sellerId) ?? "—"}</td>
                      <td className="px-4 py-2">{i.leadName}</td>
                      <td className="px-4 py-2 text-muted-foreground">{i.leadPhone ?? "—"}</td>
                      <td className="px-4 py-2 font-mono">{formatBR(i.scheduledDate)}</td>
                      <td className="px-4 py-2 font-mono">{i.scheduledTime}</td>
                      <td className="px-4 py-2"><InterviewStatusBadge status={i.status} /></td>
                      {isAdmin && (
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => { setCreatingInterview(false); setEditingInterview(i); }}
                              className="p-1.5 rounded-md bg-secondary hover:bg-secondary/70"
                              title="Editar"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInterview(i.id)}
                              className="p-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25"
                              title="Excluir"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {isAdmin && (
        <>
          <EditSellerDialog
            seller={sellers.find((s) => s.id === editingId) ?? null}
            open={!!editingId}
            onOpenChange={(o) => !o && setEditingId(null)}
            canAssignDirector
            onSave={(patch) => {
              if (!editingId) return;
              patchSeller(editingId, patch);
            }}
          />
          <InterviewFormDialog
            open={creatingInterview || !!editingInterview}
            onOpenChange={(o) => {
              if (!o) { setCreatingInterview(false); setEditingInterview(null); }
            }}
            initial={editingInterview}
            canEditAll
            sellers={fanaticos.map((s) => ({ id: s.id, name: s.name }))}
            onSave={handleSaveInterview}
          />
        </>
      )}
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
        <ArrowLeft className="size-4" /> Ranking geral
      </Link>
      <AuthBar role={role} email={email} userId={userId} />
    </header>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  highlight,
  gold,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent?: boolean;
  highlight?: string;
  gold?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-4 border overflow-hidden ${
        gold
          ? "bg-gradient-to-br from-gold/15 via-card to-card border-gold/40 shadow-[var(--shadow-gold)]"
          : accent
          ? "bg-gradient-to-br from-primary/20 via-card to-card border-primary/40"
          : "bg-card border-border"
      }`}
    >
      {gold && <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-gold to-transparent" />}
      {accent && !gold && <div className="absolute top-0 right-0 w-1 h-full bg-accent" />}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-mono">
        <Icon className={`size-3.5 ${gold ? "text-gold" : accent ? "text-accent" : "text-primary"}`} /> {label}
      </div>
      <div className={`font-display font-black text-lg md:text-xl truncate ${gold ? "text-gold" : ""}`}>{value}</div>
      {highlight && <div className={`text-xs font-mono mt-1 ${gold ? "text-gold/80" : "text-primary"}`}>{highlight}</div>}
    </div>
  );
}

function formatBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}