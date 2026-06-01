import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Seller, rankSellers, formatBRL, DEFAULT_GOALS, Weights } from "@/lib/ranking";
import {
  fetchSellers,
  insertSeller,
  updateSeller as updateSellerRow,
  deleteSellerRow,
  loadLocalConfig,
  saveLocalConfig,
} from "@/lib/storage";
import { fetchMonthlySellers } from "@/lib/monthlyRanking";
import { RankingHistory } from "@/components/RankingHistory";
import { fetchEnrollments, createEnrollment } from "@/lib/enrollments";
import { EnrollmentFormDialog } from "@/components/EnrollmentFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { Podium } from "@/components/Podium";
import { SellerRow } from "@/components/SellerRow";
import { WeightsPanel } from "@/components/WeightsPanel";
import { EditSellerDialog } from "@/components/EditSellerDialog";
import { MyWeeklyResultsDialog } from "@/components/MyWeeklyResultsDialog";
import { AuthBar } from "@/components/AuthBar";
import { WeeklyCompetitions } from "@/components/WeeklyCompetitions";
import { LatestEnrollmentSpotlight } from "@/components/LatestEnrollmentSpotlight";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Plus, Trophy, Flame, Users, Loader2, GraduationCap, Crown, Pencil, Palette, TrendingUp } from "lucide-react";
import { useBrandText, saveBrandText, type BrandText } from "@/hooks/useBrandLogo";
import { BrandLogo } from "@/components/BrandLogo";
import { getAccessibleSellerIds } from "@/lib/access";

export function RankingView() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(() => loadLocalConfig());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMyId, setEditingMyId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { userId, email, role, isStaff, loading: authLoading } = useCurrentUser();
  const cu = useCurrentUser();
  const isFranchisee = cu.isFranchisee;
  const isManager = cu.isManager;
  const isAdmin = role === "admin";
  const isCeoOrAdmin = role === "admin" || role === "ceo";
  const [teamTab, setTeamTab] = useState<"all" | "mine">("all");
  const [enrollAgg, setEnrollAgg] = useState<Record<string, { monthly: number; commission: number }>>({});
  const [vgvTotal, setVgvTotal] = useState<number>(0);
  const [claiming, setClaiming] = useState(false);
  const [enrollSellerId, setEnrollSellerId] = useState<string | null>(null);
  const [accessibleIds, setAccessibleIds] = useState<string[] | null>(null);
  const [mainTab, setMainTab] = useState<"current" | "history">("current");
  const { text: brandText, refresh: refreshBrandText } = useBrandText();
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandDraft, setBrandDraft] = useState<BrandText>(brandText);
  const [savingBrand, setSavingBrand] = useState(false);

  useEffect(() => {
    setBrandDraft(brandText);
  }, [brandText]);

  const openBrandEditor = () => {
    setBrandDraft(brandText);
    setEditingBrand(true);
  };

  const submitBrandEdit = async () => {
    setSavingBrand(true);
    try {
      await saveBrandText(brandDraft);
      await refreshBrandText();
      setEditingBrand(false);
    } catch (e) {
      alert("Não foi possível salvar: " + ((e as Error)?.message ?? "erro"));
    } finally {
      setSavingBrand(false);
    }
  };

  useEffect(() => {
    saveLocalConfig(config);
  }, [config]);

  useEffect(() => {
    if (!authLoading && !userId) {
      window.location.replace("/login");
    }
  }, [authLoading, userId]);

  useEffect(() => {
    let mounted = true;
    getAccessibleSellerIds()
      .then((ids) => mounted && setAccessibleIds(ids))
      .catch(() => mounted && setAccessibleIds(null));
    fetchMonthlySellers()
      .then((data) => {
        if (!mounted) return;
        setSellers(data);
      })
      .catch((e) => console.error("Erro ao carregar vendedores:", e))
      .finally(() => mounted && setLoading(false));

    const channel = supabase
      .channel("sellers-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sellers" },
        () => {
          fetchMonthlySellers().then((d) => mounted && setSellers(d)).catch(console.error);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interviews" },
        () => {
          fetchMonthlySellers().then((d) => mounted && setSellers(d)).catch(console.error);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        () => {
          fetchMonthlySellers().then((d) => mounted && setSellers(d)).catch(console.error);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isCeoOrAdmin) return;
    let mounted = true;
    fetchEnrollments()
      .then((rows) => {
        if (!mounted) return;
        const agg: Record<string, { monthly: number; commission: number }> = {};
        let vgv = 0;
        for (const r of rows) {
          if (r.status !== "approved") continue;
          const cur = agg[r.sellerId] ?? { monthly: 0, commission: 0 };
          cur.monthly += Number(r.monthlyFee) || 0;
          cur.commission += Number(r.commissionAmount) || 0;
          agg[r.sellerId] = cur;
          vgv +=
            (Number(r.enrollmentValue) || 0) +
            (Number(r.materialValue) || 0) +
            (Number(r.monthlyFee) || 0) * 18;
        }
        setEnrollAgg(agg);
        setVgvTotal(vgv);
      })
      .catch((e) => console.warn("Não foi possível carregar matrículas:", e));
    return () => {
      mounted = false;
    };
  }, [isCeoOrAdmin]);

  const setWeights = (weights: Weights) => setConfig({ ...config, weights });

  const ranked = useMemo(
    () => rankSellers(sellers, config.weights),
    [sellers, config.weights],
  );

  const visibleRanked = useMemo(
    () => {
      let list = ranked;
      // Ranking completo mostra todos os vendedores da rede para qualquer papel.
      // Restrições por equipe (franqueado/diretor) se aplicam apenas em Financeiro.
      if (isStaff && teamTab === "mine") list = list.filter((s) => s.inMyTeam);
      return list;
    },
    [ranked, teamTab, isStaff],
  );

  const totalMaterial = sellers.reduce((a, s) => a + s.material, 0);
  const totalDeals = sellers.reduce((a, s) => a + s.deals, 0);

  const mySellerId = useMemo(
    () => (userId ? sellers.find((s) => s.userId === userId)?.id ?? null : null),
    [sellers, userId],
  );

  const myInFanaticos = useMemo(
    () => (userId ? sellers.some((s) => s.userId === userId && s.inMyTeam) : false),
    [sellers, userId],
  );

  const addSeller = async () => {
    const draft: Omit<Seller, "id"> = {
      name: "Novo vendedor",
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
    };
    try {
      const created = await insertSeller(draft);
      setSellers((prev) => [...prev, created]);
    } catch (e) {
      console.error(e);
      alert("Erro ao adicionar vendedor. Verifique se você está autenticado como admin.");
    }
  };

  const updateSeller = (id: string, patch: Partial<Seller>) => {
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      updateSellerRow(id, patch).catch((e) => {
        console.error("Erro ao salvar:", e);
        alert("Não foi possível salvar: " + (e?.message ?? "permissão negada"));
        fetchMonthlySellers().then(setSellers).catch(console.error);
      });
    }, 400);
  };

  const deleteSeller = async (id: string) => {
    if (!confirm("Remover este vendedor?")) return;
    setSellers((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSellerRow(id);
    } catch (e) {
      console.error(e);
      alert("Erro ao remover vendedor.");
    }
  };

  const claimMySeller = async () => {
    setClaiming(true);
    try {
      const { error } = await supabase.rpc("claim_seller_profile");
      if (error) throw error;
      const data = await fetchMonthlySellers();
      setSellers(data);
    } catch (e) {
      alert("Não foi possível entrar no ranking: " + ((e as Error)?.message ?? "erro"));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link
              to="/marca"
              title="Editar identidade visual"
              aria-label="Editar identidade visual"
              className="hover:opacity-90 transition-opacity"
            >
              <BrandLogo variant="compact" />
            </Link>
          ) : (
            <BrandLogo variant="compact" />
          )}
          <div className="group/brand relative">
            <h1 className="font-display font-black text-2xl md:text-3xl leading-none tracking-tight">
              {(() => {
                const parts = brandText.title.split(" ");
                if (parts.length < 2) return brandText.title;
                const [first, ...rest] = parts;
                return (
                  <>
                    {first} <span className="text-primary">{rest.join(" ")}</span>
                  </>
                );
              })()}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-[0.18em]">
              {brandText.subtitle} <span className="text-accent">·</span> {brandText.period}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openBrandEditor}
                className="absolute -right-7 top-0 opacity-0 group-hover/brand:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-gold"
                title="Editar título e período"
                aria-label="Editar título e período"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {role === "vendedor" && (
            <>
              <Link to="/" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Meu Dashboard
              </Link>
              <Link to="/perfil" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Meu Perfil
              </Link>
              <Link to="/minha-programacao" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Minha Programação
              </Link>
              {myInFanaticos && (
                <Link to="/fanaticos" className="px-3 py-2 rounded-lg bg-gold/15 border border-gold/40 text-gold text-xs font-semibold hover:bg-gold/25">
                  Fanáticos
                </Link>
              )}
              <Link to="/minhas-comissoes" className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                Minhas Comissões
              </Link>
            </>
          )}
          {isStaff && (
            <>
              <Link to="/acessos" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Acessos
              </Link>
              <Link to="/agenda-equipe" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Agenda da Equipe
              </Link>
              {(isAdmin || role === "ceo") && (
                <Link to="/equipe" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                  Equipes
                </Link>
              )}
              {(isAdmin || role === "ceo" || role === "presidente" || role === "diretor") && (
                <Link to="/financeiro" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                  Financeiro
                </Link>
              )}
              {isAdmin && (
                <Link to="/marca" className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                  <Palette className="size-3.5" /> Marca
                </Link>
              )}
              {isAdmin && (
                <Link to="/fanaticos" className="px-3 py-2 rounded-lg bg-gold/15 border border-gold/40 text-gold text-xs font-semibold hover:bg-gold/25">
                  Fanáticos
                </Link>
              )}
              <Link to="/comissoes-equipe" className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                {role === "admin" ? "Comissões da Equipe" : "Comissões da Minha Equipe"}
              </Link>
            </>
          )}
          {!isStaff && isManager && (
            <>
              <Link to="/financeiro" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Financeiro
              </Link>
            </>
          )}
          <AuthBar role={role} email={email} userId={userId} />
        </div>
      </header>


      <section className={`grid grid-cols-2 ${isStaff ? "md:grid-cols-4" : "md:grid-cols-2"} gap-3 mb-10`}>
        {isCeoOrAdmin ? (
          <Stat icon={TrendingUp} label="VGV geral" value={formatBRL(vgvTotal)} accent />
        ) : (
          <Stat icon={Users} label="Equipe ativa" value={String(sellers.length)} />
        )}
        {isStaff && (
          <Stat icon={Flame} label="Material vendido" value={formatBRL(totalMaterial)} accent />
        )}
        {isStaff && (
          <Stat icon={GraduationCap} label="Matrículas fechadas" value={String(totalDeals)} />
        )}
        <Stat icon={Crown} label="Líder do mês" value={ranked[0]?.name ?? "—"} highlight={`${ranked[0]?.score ?? 0}%`} gold />
      </section>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando ranking…
        </div>
      )}

      {!loading && ranked.length >= 3 && (
        <section className="mb-12">
          <h2 className="font-display font-bold text-xl mb-6 flex items-center gap-2">
            <span className="text-gold">★</span> Top 3 do período
          </h2>
          <Podium top3={ranked.slice(0, 3)} />
        </section>
      )}

      {!loading && <LatestEnrollmentSpotlight sellers={sellers} weights={config.weights} />}

      {!loading && sellers.length > 0 && <WeeklyCompetitions sellers={sellers} />}

      {role === "vendedor" && mySellerId && (
        <div className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-display font-bold">Seus resultados da semana</div>
            <div className="text-xs text-muted-foreground">
              Atualize entrevistas marcadas, realizadas e matrículas fechadas.
            </div>
          </div>
          <button
            onClick={() => setEditingMyId(mySellerId)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Editar meus resultados
          </button>
        </div>
      )}

      {role === "vendedor" && !mySellerId && (
        <div className="mb-6 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display font-bold text-foreground">Entre no ranking</div>
              <div className="text-xs mt-1">
                Seu usuário ainda não está vinculado. Use o e-mail liberado em Acessos para se adicionar agora.
              </div>
            </div>
            <button
              onClick={claimMySeller}
              disabled={claiming}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {claiming && <Loader2 className="size-4 animate-spin" />}
              Entrar no ranking
            </button>
          </div>
        </div>
      )}

      <section className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-xl">
                {isStaff && teamTab === "mine" ? "Fanáticos" : "Ranking completo"}
              </h2>
              {isStaff && (
                <div className="inline-flex rounded-lg bg-secondary p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTeamTab("all")}
                    className={`px-3 py-1.5 rounded-md transition ${teamTab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamTab("mine")}
                    className={`px-3 py-1.5 rounded-md transition ${teamTab === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Fanáticos
                  </button>
                </div>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={addSeller}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
              >
                <Plus className="size-4" /> Vendedor
              </button>
            )}
          </div>
          <div className="space-y-2">
            {visibleRanked.map((s, i) => {
              const isMine = role === "vendedor" && s.userId === userId;
              const extra = enrollAgg[s.id];
              return (
                <SellerRow
                  key={s.id}
                  seller={s}
                  rank={i + 1}
                  onChange={(patch) => updateSeller(s.id, patch)}
                  onDelete={() => deleteSeller(s.id)}
                  onEdit={() => (isStaff ? setEditingId(s.id) : setEditingMyId(s.id))}
                  onAddEnrollment={isStaff ? () => setEnrollSellerId(s.id) : undefined}
                  readOnly={!isStaff}
                  showEditButton={isStaff || isMine}
                  editLabel={isMine && !isStaff ? "Editar meus resultados" : undefined}
                  showFinancial={isAdmin}
                  monthlyFees={extra?.monthly ?? 0}
                  estimatedCommission={extra?.commission ?? 0}
                />
              );
            })}
            {!loading && visibleRanked.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                {isStaff && teamTab === "mine"
                  ? "Nenhum vendedor na sua equipe ainda. Marque 'Está na minha equipe' ao editar um vendedor."
                  : "Nenhum vendedor cadastrado."}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <WeightsPanel weights={config.weights} onWeights={setWeights} readOnly={!isStaff} />
          <div className="rounded-2xl bg-gradient-to-br from-card to-secondary border border-border p-5 text-sm">
            <div className="font-display font-bold mb-2">Como funciona</div>
            <p className="text-muted-foreground leading-relaxed">
              Cada vendedor recebe uma pontuação de 0 a 150%, calculada pela meta individual atingida em cada critério e ponderada pelos pesos. Vendedores só podem atualizar os próprios números da semana; admin gerencia todo o resto.
            </p>
          </div>
        </aside>
      </section>

      <footer className="mt-16 text-center text-xs text-muted-foreground">
        Dados sincronizados em tempo real para toda a equipe.
      </footer>

      <EditSellerDialog
        seller={sellers.find((s) => s.id === editingId) ?? null}
        open={!!editingId}
        onOpenChange={(o) => !o && setEditingId(null)}
        canAssignDirector={isAdmin}
        canManageFanaticos={isAdmin}
        onSave={(patch) => {
          if (!editingId) return;
          updateSeller(editingId, patch);
        }}
      />

      <MyWeeklyResultsDialog
        seller={sellers.find((s) => s.id === editingMyId) ?? null}
        open={!!editingMyId}
        onOpenChange={(o) => !o && setEditingMyId(null)}
        onSave={(patch) => {
          if (!editingMyId) return;
          updateSeller(editingMyId, patch);
        }}
      />

      {isStaff && (
        <EnrollmentFormDialog
          open={!!enrollSellerId}
          onOpenChange={(o) => !o && setEnrollSellerId(null)}
          defaultSellerId={enrollSellerId}
          sellers={sellers.map((s) => ({ id: s.id, name: s.name, role: s.role }))}
          canEditAll={true}
          onSave={async (input) => {
            await createEnrollment(input);
            const data = await fetchMonthlySellers();
            setSellers(data);
          }}
        />
      )}

      {editingBrand && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !savingBrand && setEditingBrand(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card border border-primary/30 shadow-[var(--shadow-glow)] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-display font-black text-lg">Editar identidade do painel</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Estas informações aparecem no topo do dashboard para toda a equipe.
              </p>
            </div>
            <label className="block">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Título</div>
              <input
                value={brandDraft.title}
                onChange={(e) => setBrandDraft({ ...brandDraft, title: e.target.value })}
                className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Subtítulo</div>
              <input
                value={brandDraft.subtitle}
                onChange={(e) => setBrandDraft({ ...brandDraft, subtitle: e.target.value })}
                className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Período</div>
              <input
                value={brandDraft.period}
                onChange={(e) => setBrandDraft({ ...brandDraft, period: e.target.value })}
                className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBrand(false)}
                disabled={savingBrand}
                className="px-4 py-2 rounded-lg bg-secondary text-sm font-semibold hover:bg-secondary/70 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitBrandEdit}
                disabled={savingBrand}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {savingBrand && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
  icon: typeof Trophy;
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