import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Users, UserPlus, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchActiveLinksForManager,
  fetchAllActiveLinks,
  addSellerToTeam,
  removeLink,
  deactivateActiveLinkForSeller,
  type TeamLink,
} from "@/lib/teamLinks";
import { ROLE_LABELS, type SellerRole } from "@/lib/commissions";

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
  head: () => ({
    meta: [
      { title: "Equipes — Arena United" },
      { name: "description", content: "Gestão de equipes de vendedores por diretor/franqueado." },
    ],
  }),
});

type SellerLite = { id: string; name: string; role: SellerRole; user_id: string | null };

type ManagerLite = { user_id: string; name: string; email: string; app_role: string };

function EquipePage() {
  const { loading, userId, isStaff, isManager, isFranchisee, role } = useCurrentUser();
  const navigate = useNavigate();

  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [links, setLinks] = useState<TeamLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managers, setManagers] = useState<ManagerLite[]>([]);
  const [activeManagerId, setActiveManagerId] = useState<string | null>(null);

  // Gestor "ativo" para operações: admin pode escolher; demais usam o próprio id.
  const effectiveManagerId = isStaff ? activeManagerId : userId;

  useEffect(() => {
    if (!loading && !userId) navigate({ to: "/login" });
  }, [loading, userId, navigate]);

  // Inicializa activeManagerId quando staff
  useEffect(() => {
    if (isStaff && userId && activeManagerId === null) {
      setActiveManagerId(userId);
    }
  }, [isStaff, userId, activeManagerId]);

  // Carrega lista de gestores (admins veem todos os franqueados/diretores/ceo)
  useEffect(() => {
    if (!isStaff) return;
    let mounted = true;
    supabase
      .from("allowed_emails")
      .select("used_by,name,email,app_role")
      .not("used_by", "is", null)
      .in("app_role", ["franqueado", "diretor", "ceo", "presidente", "admin"])
      .order("name")
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setError(error.message);
          return;
        }
        const rows = (data ?? [])
          .filter((r) => r.used_by)
          .map((r) => ({
            user_id: r.used_by as string,
            name: r.name as string,
            email: r.email as string,
            app_role: r.app_role as string,
          }));
        setManagers(rows);
      });
    return () => {
      mounted = false;
    };
  }, [isStaff]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    Promise.all([
      supabase.from("sellers").select("id,name,role,user_id").order("name"),
      isStaff ? fetchAllActiveLinks() : fetchActiveLinksForManager(userId),
    ])
      .then(([sellersRes, linksRes]) => {
        if (!mounted) return;
        if (sellersRes.error) throw sellersRes.error;
        setSellers((sellersRes.data ?? []) as SellerLite[]);
        setLinks(linksRes);
      })
      .catch((e) => setError((e as Error).message));
    return () => {
      mounted = false;
    };
  }, [userId, isStaff]);

  const reloadLinks = async () => {
    if (!userId) return;
    const fresh = isStaff
      ? await fetchAllActiveLinks()
      : await fetchActiveLinksForManager(userId);
    setLinks(fresh);
  };

  const myLinks = useMemo(
    () => links.filter((l) => l.managerUserId === effectiveManagerId),
    [links, effectiveManagerId],
  );
  const linksBySeller = useMemo(() => {
    const m = new Map<string, TeamLink>();
    for (const l of links) m.set(l.sellerId, l);
    return m;
  }, [links]);

  const myTeamIds = new Set(myLinks.map((l) => l.sellerId));

  const handleAdd = async (sellerId: string) => {
    if (!effectiveManagerId) return;
    setError(null);
    const existing = linksBySeller.get(sellerId);
    if (existing && existing.managerUserId !== effectiveManagerId) {
      if (!isStaff) {
        setError(
          "Este vendedor já pertence à equipe de outro gestor. Peça ao admin/CEO para liberar.",
        );
        return;
      }
      if (
        !confirm(
          "Este vendedor já pertence à equipe de outro gestor. Deseja transferir para a sua equipe?",
        )
      )
        return;
      setBusy(true);
      try {
        await deactivateActiveLinkForSeller(sellerId);
        await addSellerToTeam(effectiveManagerId, sellerId);
        await reloadLinks();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      await addSellerToTeam(effectiveManagerId, sellerId);
      await reloadLinks();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (linkId: string) => {
    if (!confirm("Remover este vendedor da equipe?")) return;
    setBusy(true);
    try {
      await removeLink(linkId);
      await reloadLinks();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  if (!isManager) {
    return (
      <main className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-2">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores, CEO, presidente, diretores e franqueados podem gerenciar
          equipes.
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

  const myTeam = sellers.filter((s) => myTeamIds.has(s.id));
  const available = sellers.filter((s) => !myTeamIds.has(s.id));
  const activeManager = managers.find((m) => m.user_id === effectiveManagerId);
  const teamLabel = isStaff
    ? activeManager
      ? `Equipe de ${activeManager.name}`
      : "Equipe selecionada"
    : "Vinculados a mim";

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Users className="size-6 text-primary" />
          <div>
            <h1 className="font-display font-black text-2xl">
              {isStaff ? "Equipes da Rede" : "Minha Equipe"}
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {isFranchisee && !isStaff ? "Franquia" : role}
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

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isStaff && (
        <section className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
            Gerenciar equipe de
          </label>
          <select
            value={effectiveManagerId ?? ""}
            onChange={(e) => setActiveManagerId(e.target.value)}
            className="w-full md:w-96 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {userId && (
              <option value={userId}>
                Eu mesmo ({role})
              </option>
            )}
            {managers
              .filter((m) => m.user_id !== userId)
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name} — {m.app_role}
                </option>
              ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-2">
            Defina quais vendedores este gestor pode ver e editar no Financeiro.
          </p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="font-display font-bold text-lg mb-3">
          {teamLabel} ({myTeam.length})
        </h2>
        {myTeam.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum vendedor vinculado ainda. Adicione abaixo.
          </p>
        ) : (
          <div className="space-y-2">
            {myTeam.map((s) => {
              const link = myLinks.find((l) => l.sellerId === s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ROLE_LABELS[s.role]}
                    </div>
                  </div>
                  <button
                    onClick={() => link && handleRemove(link.id)}
                    disabled={busy}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    <Trash2 className="size-3.5" /> Remover
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">
          Vendedores disponíveis ({available.length})
        </h2>
        <div className="space-y-2">
          {available.map((s) => {
            const taken = linksBySeller.get(s.id);
            const takenByOther = taken && taken.managerUserId !== userId;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
              >
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {s.name}
                    {takenByOther && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        já em outra equipe
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABELS[s.role]}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(s.id)}
                  disabled={busy || (!!takenByOther && !isStaff)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <UserPlus className="size-3.5" /> Adicionar
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
