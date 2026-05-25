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
import { supabase } from "@/integrations/supabase/client";
import { Podium } from "@/components/Podium";
import { SellerRow } from "@/components/SellerRow";
import { WeightsPanel } from "@/components/WeightsPanel";
import { EditSellerDialog } from "@/components/EditSellerDialog";
import { MyWeeklyResultsDialog } from "@/components/MyWeeklyResultsDialog";
import { AuthBar } from "@/components/AuthBar";
import { WeeklyCompetitions } from "@/components/WeeklyCompetitions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Plus, Trophy, Flame, Users, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Arena Fanáticos — Ranking da equipe" },
      { name: "description", content: "Ranking compartilhado da equipe com metas individuais e leaderboard em tempo real." },
    ],
  }),
});

function Index() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(() => loadLocalConfig());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMyId, setEditingMyId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { userId, email, role } = useCurrentUser();
  const isAdmin = role === "admin";

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

  const setWeights = (weights: Weights) => setConfig({ ...config, weights });

  const ranked = useMemo(
    () => rankSellers(sellers, config.weights),
    [sellers, config.weights],
  );

  const totalMaterial = sellers.reduce((a, s) => a + s.material, 0);
  const totalDeals = sellers.reduce((a, s) => a + s.deals, 0);

  const mySellerId = useMemo(
    () => (userId ? sellers.find((s) => s.userId === userId)?.id ?? null : null),
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
          <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-bronze flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Trophy className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl md:text-3xl leading-none">Arena Fanáticos</h1>
            <p className="text-xs text-muted-foreground mt-1">Leaderboard da equipe · {config.period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={config.period}
            onChange={(e) => setConfig({ ...config, period: e.target.value })}
            disabled={!isAdmin}
            className="bg-input rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary w-36 disabled:opacity-60"
          />
          {role === "vendedor" && (
            <>
              <Link to="/minha-programacao" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Minha Programação
              </Link>
              <Link to="/minhas-comissoes" className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                Minhas Comissões
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to="/agenda-equipe" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Agenda da Equipe
              </Link>
              <Link to="/comissoes-equipe" className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                Comissões da Equipe
              </Link>
            </>
          )}
          <AuthBar role={role} email={email} userId={userId} />
        </div>
      </header>


      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat icon={Users} label="Vendedores" value={String(sellers.length)} />
        <Stat icon={Flame} label="Material vendido" value={formatBRL(totalMaterial)} accent />
        <Stat icon={Trophy} label="Nº de vendas" value={String(totalDeals)} />
        <Stat icon={Flame} label="Líder" value={ranked[0]?.name ?? "—"} highlight={`${ranked[0]?.score ?? 0}%`} />
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl">Ranking completo</h2>
            {isAdmin && (
              <button
                onClick={addSeller}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
              >
                <Plus className="size-4" /> Vendedor
              </button>
            )}
          </div>
          <div className="hidden md:grid grid-cols-[40px_minmax(140px,1.5fr)_1fr_1fr_70px_56px] gap-3 px-4 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
            <div>#</div>
            <div>Vendedor</div>
            <div>Nº vendas</div>
            <div>Material</div>
            <div className="text-right">Score</div>
            <div></div>
          </div>
          <div className="space-y-2">
            {ranked.map((s, i) => {
              const isMine = role === "vendedor" && s.userId === userId;
              return (
                <SellerRow
                  key={s.id}
                  seller={s}
                  rank={i + 1}
                  onChange={(patch) => updateSeller(s.id, patch)}
                  onDelete={() => deleteSeller(s.id)}
                  onEdit={() => (isAdmin ? setEditingId(s.id) : setEditingMyId(s.id))}
                  readOnly={!isAdmin}
                  showEditButton={isAdmin || isMine}
                  editLabel={isMine && !isAdmin ? "Editar meus resultados" : undefined}
                />
              );
            })}
            {!loading && ranked.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                Nenhum vendedor cadastrado.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <WeightsPanel weights={config.weights} onWeights={setWeights} readOnly={!isAdmin} />
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
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  highlight,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  accent?: boolean;
  highlight?: string;
}) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? "bg-gradient-to-br from-primary/15 to-transparent border-primary/30" : "bg-card border-border"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="font-display font-bold text-lg md:text-xl truncate">{value}</div>
      {highlight && <div className="text-xs font-mono text-primary mt-1">{highlight}</div>}
    </div>
  );
}
