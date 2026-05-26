import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AuthBar } from "@/components/AuthBar";
import { SellerRow } from "@/components/SellerRow";
import { Podium } from "@/components/Podium";
import { fetchSellers, loadLocalConfig } from "@/lib/storage";
import { Seller, rankSellers } from "@/lib/ranking";
import { fetchEnrollments } from "@/lib/enrollments";

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
    <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-8 py-8">
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

      {fanaticos.length >= 3 && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <span className="text-gold">★</span> Top 3 Fanáticos
          </h2>
          <Podium top3={fanaticos.slice(0, 3)} />
        </section>
      )}

      <section>
        <h2 className="font-display font-bold text-xl mb-4">Ranking dos Fanáticos</h2>
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
                  onChange={() => {}}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  readOnly
                  showEditButton={false}
                  showFinancial={isAdmin}
                  monthlyFees={extra?.monthly ?? 0}
                  estimatedCommission={extra?.commission ?? 0}
                />
              );
            })}
          </div>
        )}
      </section>
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