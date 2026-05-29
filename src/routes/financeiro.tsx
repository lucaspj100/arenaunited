import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, ArrowLeft, DollarSign } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const Route = createFileRoute("/financeiro")({
  component: FinanceiroLayout,
  head: () => ({
    meta: [
      { title: "Financeiro Comercial — Arena United" },
      { name: "description", content: "CAC, LTV, MRR e ROI da equipe comercial." },
    ],
  }),
});

function FinanceiroLayout() {
  const { loading, userId, role, isFranchisee } = useCurrentUser();
  const allowed =
    role === "admin" ||
    role === "ceo" ||
    role === "presidente" ||
    role === "diretor" ||
    isFranchisee;
  const canSeeGeneral =
    role === "admin" || role === "ceo" || role === "presidente";
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !userId) navigate({ to: "/login" });
  }, [loading, userId, navigate]);

  // Redireciona /financeiro -> destino conforme permissão
  useEffect(() => {
    if (location.pathname === "/financeiro") {
      navigate({
        to: canSeeGeneral ? "/financeiro/geral" : "/financeiro/equipes",
        replace: true,
      });
    }
  }, [location.pathname, navigate, canSeeGeneral]);

  // Bloqueia acesso direto a /financeiro/geral para quem não pode
  useEffect(() => {
    if (!canSeeGeneral && location.pathname === "/financeiro/geral") {
      navigate({ to: "/financeiro/equipes", replace: true });
    }
  }, [canSeeGeneral, location.pathname, navigate]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-2">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          O módulo financeiro é restrito a admin, CEO, diretores e franqueados.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
        >
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="size-6 text-primary" />
          <div>
            <h1 className="font-display font-black text-2xl">Financeiro Comercial</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              CAC · LTV · MRR · ROI
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
        >
          <ArrowLeft className="size-3.5 inline mr-1" /> Voltar
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
        {canSeeGeneral && <TabLink to="/financeiro/geral" label="Geral" />}
        <TabLink to="/financeiro/equipes" label="Por equipe" />
        <TabLink to="/financeiro/config" label="Configurações" />
      </nav>

      <Outlet />
    </main>
  );
}

function TabLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary hover:bg-secondary/70"
      }`}
    >
      {label}
    </Link>
  );
}
