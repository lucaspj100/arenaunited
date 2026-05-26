import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Trophy } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Cadastro — Arena United" }] }),
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.includes("não está autorizado")
        ? "Este e-mail ainda não foi liberado pelo administrador."
        : error.message.includes("já foi utilizado")
          ? "Este convite já foi usado. Faça login."
          : error.message;
      setError(msg);
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
            <h1 className="font-display font-black text-xl leading-none">Criar conta</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Use o e-mail liberado pelo administrador
            </p>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Confirmar senha</div>
          <input
            type="password"
            required
            minLength={8}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Criar conta
        </button>

        <p className="text-[11px] text-muted-foreground text-center pt-1">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}