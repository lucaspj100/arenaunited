import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogIn } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Entrar — United Performance" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // logo via <BrandLogo />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[var(--gradient-arena)]" />
      <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(circle_at_30%_20%,var(--united-blue),transparent_50%),radial-gradient(circle_at_70%_80%,var(--united-red),transparent_45%)]" />

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-2xl bg-primary/40" />
            <div className="relative">
              <BrandLogo variant="full" size={112} />
            </div>
          </div>
          <h1 className="mt-5 font-display font-black text-3xl tracking-tight text-center">
            United <span className="text-primary">Performance</span>
          </h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground text-center">
            Acesso exclusivo <span className="text-accent">·</span> Arena comercial
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 p-7 rounded-2xl bg-card/80 backdrop-blur border border-primary/20 shadow-[var(--shadow-card)] relative"
        >
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

          <label className="block">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1.5">E-mail</div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-3 py-2.5 text-sm outline-none focus:border-primary transition"
            />
          </label>

          <label className="block">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Senha</div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-3 py-2.5 text-sm outline-none focus:border-primary transition"
            />
          </label>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-gold to-[oklch(0.78_0.18_70)] text-united-navy text-sm font-black uppercase tracking-wider hover:shadow-[var(--shadow-gold)] disabled:opacity-60 transition-all"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Entrar na Arena
          </button>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Primeiro acesso?{" "}
            <Link to="/cadastro" className="text-primary font-semibold hover:underline">
              Criar conta
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          United Idiomas
        </p>
      </div>
    </main>
  );
}
