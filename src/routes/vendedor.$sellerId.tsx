import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fetchSellers } from "@/lib/storage";
import { Seller } from "@/lib/ranking";
import { SellerDashboardContainer } from "@/components/SellerDashboardContainer";

export const Route = createFileRoute("/vendedor/$sellerId")({
  component: SellerDashboardPage,
  head: () => ({ meta: [{ title: "Dashboard do vendedor — Arena United" }] }),
});

function SellerDashboardPage() {
  const { sellerId } = Route.useParams();
  const navigate = useNavigate();
  const { loading: authLoading, userId, isStaff } = useCurrentUser();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !userId) navigate({ to: "/login" });
  }, [authLoading, userId, navigate]);

  useEffect(() => {
    let mounted = true;
    fetchSellers()
      .then((d) => mounted && setSellers(d))
      .catch((e) => mounted && setError(e.message))
      .finally(() => mounted && setLoadingSellers(false));
    return () => {
      mounted = false;
    };
  }, [sellerId]);

  const seller = sellers.find((s) => s.id === sellerId) ?? null;

  const canSee = useMemo(() => {
    if (!userId || !seller) return false;
    if (isStaff) return true;
    return seller.userId === userId;
  }, [isStaff, userId, seller]);

  const isOwn = !!(userId && seller && seller.userId === userId);

  if (authLoading || loadingSellers) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin mr-2" /> Carregando…
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="min-h-screen px-4 md:px-8 py-12 max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Vendedor não encontrado.
        </div>
      </main>
    );
  }

  if (!canSee) {
    return (
      <main className="min-h-screen px-4 md:px-8 py-12 max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <div className="font-display font-bold text-lg mb-1">Acesso negado</div>
          <div className="text-sm text-muted-foreground">
            Você só pode acessar o seu próprio dashboard.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-5xl mx-auto">
      {error && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <SellerDashboardContainer
        sellerId={sellerId}
        showMotivation={isOwn}
        headerExtras={
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
      />
    </main>
  );
}