import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArrowLeft, Loader2, Mail, Plus, Trash2, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/acessos")({
  component: AccessesPage,
  head: () => ({ meta: [{ title: "Acessos da equipe — Arena United" }] }),
});

type Invite = {
  id: string;
  email: string;
  name: string;
  role: "consultor" | "gerente";
  app_role: "vendedor" | "diretor" | "admin";
  used_at: string | null;
  created_at: string;
};

function AccessesPage() {
  const { loading: ul, isStaff } = useCurrentUser();
  const navigate = useNavigate();
  const [items, setItems] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [r, setR] = useState<"consultor" | "gerente">("consultor");
  const [appRole, setAppRole] = useState<"vendedor" | "diretor">("vendedor");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (ul) return;
    if (!isStaff) {
      navigate({ to: "/" });
      return;
    }
    load();
  }, [ul, isStaff, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("allowed_emails")
      .select("id,email,name,role,app_role,used_at,created_at")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setItems((data ?? []) as Invite[]);
    setLoading(false);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("allowed_emails").insert({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: r,
      app_role: appRole,
    });
    setSaving(false);
    if (error) {
      setErr(error.message.includes("duplicate") ? "Este e-mail já está na lista." : error.message);
      return;
    }
    setEmail("");
    setName("");
    setR("consultor");
    setAppRole("vendedor");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este acesso?")) return;
    const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  };

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-8">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-primary" />
          <h1 className="font-display font-black text-xl">Acessos da equipe</h1>
        </div>
      </header>

      <form onSubmit={add} className="rounded-2xl bg-card border border-border p-5 mb-6 space-y-3">
        <h2 className="font-display font-bold text-sm">Liberar novo e-mail</h2>
        <div className="grid sm:grid-cols-[1fr_1fr_130px_140px_auto] gap-2">
          <input
            type="email"
            placeholder="email@exemplo.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Nome do vendedor"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={appRole}
            onChange={(e) => setAppRole(e.target.value as "vendedor" | "diretor")}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="vendedor">Vendedor</option>
            <option value="diretor">Diretor</option>
          </select>
          <select
            value={r}
            onChange={(e) => setR(e.target.value as "consultor" | "gerente")}
            disabled={appRole === "diretor"}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="consultor">Consultor</option>
            <option value="gerente">Gerente</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Liberar
          </button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <p className="text-[11px] text-muted-foreground">
          A pessoa criará a senha sozinha em <span className="font-mono">/cadastro</span>. Diretores entram com acesso administrativo (exceto comissões da equipe).
        </p>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl text-sm">
          Nenhum e-mail liberado ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-card border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{i.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{i.email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {i.app_role === "diretor" ? (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-primary/15 text-primary font-mono">
                    <ShieldCheck className="size-3" /> Diretor
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-secondary font-mono">
                    {i.role}
                  </span>
                )}
                {i.used_at ? (
                  <span className="flex items-center gap-1 text-[10px] text-primary font-mono">
                    <CheckCircle2 className="size-3" /> Usado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Clock className="size-3" /> Aguardando
                  </span>
                )}
                <button
                  onClick={() => remove(i.id)}
                  className="size-7 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center"
                  title="Remover"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}