import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogIn, Trophy } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Entrar — Arena United" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 p-6 rounded-2xl bg-card border border-border shadow-lg"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-bronze flex items-center justify-center">
            <Trophy className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl leading-none">Arena United</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Acesso da equipe</p>
          </div>
        </div>

        <label className="block">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">E-mail</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Senha</div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          Entrar
        </button>

        <p className="text-[11px] text-muted-foreground text-center pt-1">
          Acesso restrito. Usuários são criados pelo administrador.
        </p>
      </form>
    </main>
  );
}
