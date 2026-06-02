import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { RankingView } from "@/components/RankingView";
import { SellerDashboardContainer } from "@/components/SellerDashboardContainer";
import { AuthBar } from "@/components/AuthBar";

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
  const { loading, userId, email, role, isStaff, isFranchisee, isDirectorLike, sellerId } =
    useCurrentUser();

  useEffect(() => {
    if (!loading && !userId) window.location.replace("/login");
  }, [loading, userId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  // Vendedor (não staff) com vínculo: vê o próprio dashboard como home
  if (role === "vendedor" && sellerId && !isStaff) {
    return (
      <main className="min-h-screen px-4 md:px-8 py-8 max-w-5xl mx-auto">
        <SellerDashboardContainer
          sellerId={sellerId}
          showMotivation
          headerExtras={
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/ranking"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
              >
                <ArrowLeft className="size-3.5" /> Ranking
              </Link>
              {(isFranchisee || isDirectorLike) && (
                <Link
                  to="/meu-dashboard"
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                >
                  Meu Dashboard
                </Link>
              )}
              <Link to="/perfil" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Meu Perfil
              </Link>
              <Link to="/minha-programacao" className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
                Minha Programação
              </Link>
              <Link to="/minhas-comissoes" className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                Minhas Comissões
              </Link>
              <AuthBar role={role} email={email} userId={userId} />
            </div>
          }
        />
      </main>
    );
  }

  // Staff, vendedor sem vínculo ou sem papel: ranking padrão
  return <RankingView />;
}