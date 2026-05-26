import { createFileRoute, Link } from "@tanstack/react-router";
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
import { fetchEnrollments } from "@/lib/enrollments";
import { supabase } from "@/integrations/supabase/client";
import { Podium } from "@/components/Podium";
import { SellerRow } from "@/components/SellerRow";
import { WeightsPanel } from "@/components/WeightsPanel";
import { EditSellerDialog } from "@/components/EditSellerDialog";
import { MyWeeklyResultsDialog } from "@/components/MyWeeklyResultsDialog";
import { AuthBar } from "@/components/AuthBar";
import { WeeklyCompetitions } from "@/components/WeeklyCompetitions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Plus, Trophy, Flame, Users, Loader2, GraduationCap, Crown, ImageUp, Pencil } from "lucide-react";
import { useBrandLogo, uploadBrandLogo, useBrandText, saveBrandText, type BrandText } from "@/hooks/useBrandLogo";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "United Performance — Arena Comercial" },
      { name: "description", content: "Painel comercial da equipe United Idiomas com ranking, metas e performance em tempo real." },
    ],
  }),
});

function Index() {
  // Render title with "United" highlighted if it appears as the first word
  // (e.g. "United Performance" → United <span>Performance</span>)

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(() => loadLocalConfig());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMyId, setEditingMyId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { userId, email, role, isStaff } = useCurrentUser();
  const isAdmin = role === "admin";
  const [teamTab, setTeamTab] = useState<"all" | "mine">("all");
  const [enrollAgg, setEnrollAgg] = useState<Record<string, { monthly: number; commission: number }>>({});
  const { logoUrl, refresh: refreshLogo } = useBrandLogo();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      await uploadBrandLogo(file);
      await refreshLogo();
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar a logo: " + ((err as Error)?.message ?? "erro"));
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    saveLocalConfig(config);
  }, [config]);

  useEffect(() => {
    let mounted = true;
    fetchSellers()
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
          fetchSellers().then((d) => mounted && setSellers(d)).catch(console.error);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    fetchEnrollments()
      .then((rows) => {
        if (!mounted) return;
        const agg: Record<string, { monthly: number; commission: number }> = {};
        for (const r of rows) {
          const cur = agg[r.sellerId] ?? { monthly: 0, commission: 0 };
          cur.monthly += Number(r.monthlyFee) || 0;
          cur.commission += Number(r.commissionAmount) || 0;
          agg[r.sellerId] = cur;
        }
        setEnrollAgg(agg);
      })
      .catch((e) => console.warn("Não foi possível carregar matrículas:", e));
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const setWeights = (weights: Weights) => setConfig({ ...config, weights });

  const ranked = useMemo(
    () => rankSellers(sellers, config.weights),
    [sellers, config.weights],
  );

  const visibleRanked = useMemo(
    () => (isStaff && teamTab === "mine" ? ranked.filter((s) => s.inMyTeam) : ranked),
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
  const canSeeFanaticos = isAdmin || (role === "vendedor" && myInFanaticos);

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
        fetchSellers().then(setSellers).catch(console.error);
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

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button
              type="button"
              onClick={() => isAdmin && logoInputRef.current?.click()}
              disabled={!isAdmin || uploadingLogo}
              className={`size-14 rounded-2xl bg-gradient-to-br from-united-navy to-secondary border border-primary/30 flex items-center justify-center shadow-[var(--shadow-glow)] overflow-hidden ${isAdmin ? "cursor-pointer hover:border-primary/60" : "cursor-default"}`}
              title={isAdmin ? "Clique para trocar a logo" : "United Performance"}
              aria-label={isAdmin ? "Trocar logo" : "Logo"}
            >
              <img src={logoUrl} alt="United" className="size-10 object-contain" />
              {isAdmin && (
                <span className="absolute inset-0 flex items-center justify-center bg-united-navy/70 opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingLogo ? (
                    <Loader2 className="size-5 animate-spin text-gold" />
                  ) : (
                    <ImageUp className="size-5 text-gold" />
                  )}
                </span>
              )}
            </button>
            {isAdmin && (
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
            )}
          </div>
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
              {isAdmin && (
                <Link to="/fanaticos" className="px-3 py-2 rounded-lg bg-gold/15 border border-gold/40 text-gold text-xs font-semibold hover:bg-gold/25">
                  Fanáticos
                </Link>
              )}
              <Link to="/comissoes-equipe" className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                {role === "diretor" ? "Comissões da Minha Equipe" : "Comissões da Equipe"}
              </Link>
            </>
          )}
          <AuthBar role={role} email={email} userId={userId} />
        </div>
      </header>


      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat icon={Users} label="Equipe ativa" value={String(sellers.length)} />
        <Stat icon={Flame} label="Material vendido" value={formatBRL(totalMaterial)} accent />
        <Stat icon={GraduationCap} label="Matrículas fechadas" value={String(totalDeals)} />
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
          Seu usuário ainda não está vinculado a um vendedor. Peça ao administrador para vincular.
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
