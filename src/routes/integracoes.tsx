import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Plug, Plus, RefreshCw, Trash2, Eye, X } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import {
  listCrmLinks,
  createCrmLink,
  updateCrmLink,
  deleteCrmLink,
  listCrmEvents,
} from "@/lib/crmIntegration.functions";

export const Route = createFileRoute("/integracoes")({
  component: IntegrationsPage,
  head: () => ({ meta: [{ title: "Integrações CRM — Arena United" }] }),
});

type CrmLink = {
  id: string;
  crm_user_id: string;
  arena_seller_id: string;
  active: boolean;
  created_at: string;
};
type EventRow = {
  id: string;
  event_type: string;
  crm_lead_id: string | null;
  crm_user_id: string | null;
  arena_seller_id: string | null;
  payload: any;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};
type SellerLite = { id: string; name: string };

function IntegrationsPage() {
  const { loading: ul, isStaff } = useCurrentUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"links" | "logs">("links");

  useEffect(() => {
    if (ul) return;
    if (!isStaff) navigate({ to: "/" });
  }, [ul, isStaff, navigate]);

  if (ul || !isStaff) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-primary" />
          <h1 className="font-display font-black text-xl">Integrações CRM</h1>
        </div>
      </header>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("links")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold ${tab === "links" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
        >
          Vínculos
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold ${tab === "logs" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
        >
          Logs
        </button>
      </div>

      {tab === "links" ? <LinksTab /> : <LogsTab />}
    </main>
  );
}

function LinksTab() {
  const list = useServerFn(listCrmLinks);
  const create = useServerFn(createCrmLink);
  const update = useServerFn(updateCrmLink);
  const remove = useServerFn(deleteCrmLink);

  const [links, setLinks] = useState<CrmLink[]>([]);
  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [crmUserId, setCrmUserId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sellersById = useMemo(() => {
    const m = new Map<string, string>();
    sellers.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sellers]);

  const load = async () => {
    setLoading(true);
    try {
      const [ls, { data: ss }] = await Promise.all([
        list(),
        supabase.from("sellers").select("id, name").order("name"),
      ]);
      setLinks(ls as CrmLink[]);
      setSellers((ss ?? []) as SellerLite[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!crmUserId.trim() || !sellerId) return;
    setSaving(true);
    try {
      await create({ data: { crm_user_id: crmUserId.trim(), arena_seller_id: sellerId, active: true } });
      setCrmUserId("");
      setSellerId("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao criar vínculo.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (l: CrmLink) => {
    await update({ data: { id: l.id, active: !l.active } });
    await load();
  };

  const onDelete = async (l: CrmLink) => {
    if (!confirm("Remover este vínculo?")) return;
    await remove({ data: { id: l.id } });
    await load();
  };

  return (
    <section>
      <form onSubmit={onCreate} className="rounded-2xl bg-card border border-border p-5 mb-6 space-y-3">
        <h2 className="font-display font-bold text-sm">Novo vínculo CRM → Arena</h2>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input
            placeholder="crm_user_id (UUID do usuário no Funil Pro)"
            value={crmUserId}
            onChange={(e) => setCrmUserId(e.target.value)}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            required
          />
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            required
          >
            <option value="">Selecione o vendedor da Arena…</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Vincular
          </button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <p className="text-[11px] text-muted-foreground">
          Apenas vendedores com vínculo ativo recebem eventos do CRM. Os demais continuam totalmente manuais.
        </p>
      </form>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Vínculos ativos</h3>
          <button onClick={load} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <RefreshCw className="size-3.5" /> Atualizar
          </button>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Nenhum vínculo cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">CRM User</th>
                <th className="text-left px-4 py-2">Vendedor Arena</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs">{l.crm_user_id}</td>
                  <td className="px-4 py-2">{sellersById.get(l.arena_seller_id) ?? l.arena_seller_id}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggle(l)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${l.active ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                    >
                      {l.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => onDelete(l)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Remover"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function LogsTab() {
  const list = useServerFn(listCrmEvents);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [view, setView] = useState<EventRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await list({
        data: {
          status: (status || null) as any,
          eventType: eventType || null,
          limit: 200,
        },
      });
      setRows(r as EventRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, eventType]);

  const statusBadge = (s: string) => {
    const cls =
      s === "processed"
        ? "bg-emerald-500/15 text-emerald-500"
        : s === "ignored"
          ? "bg-muted text-muted-foreground"
          : s === "error"
            ? "bg-destructive/15 text-destructive"
            : "bg-amber-500/15 text-amber-500";
    return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>{s}</span>;
  };

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg bg-input border border-border px-3 py-1.5 text-xs">
          <option value="">Todos os status</option>
          <option value="received">Recebido</option>
          <option value="processed">Processado</option>
          <option value="ignored">Ignorado</option>
          <option value="error">Erro</option>
        </select>
        <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="rounded-lg bg-input border border-border px-3 py-1.5 text-xs">
          <option value="">Todos os eventos</option>
          <option value="crm_interview_scheduled">crm_interview_scheduled</option>
          <option value="crm_interview_done">crm_interview_done</option>
          <option value="crm_interview_no_show">crm_interview_no_show</option>
          <option value="crm_interview_rescheduled">crm_interview_rescheduled</option>
          <option value="crm_enrollment_created">crm_enrollment_created</option>
          <option value="crm_lost_after_interview">crm_lost_after_interview</option>
        </select>
        <button onClick={load} className="ml-auto text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70">
          <RefreshCw className="size-3.5" /> Atualizar
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Nenhum evento recebido ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Data</th>
                <th className="text-left px-4 py-2">Evento</th>
                <th className="text-left px-4 py-2">Lead</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Erro</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.event_type}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.crm_lead_id ?? "—"}</td>
                  <td className="px-4 py-2">{statusBadge(r.status)}</td>
                  <td className="px-4 py-2 text-xs text-destructive truncate max-w-[260px]" title={r.error_message ?? ""}>
                    {r.error_message ?? ""}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setView(r)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      title="Ver payload"
                    >
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {view && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setView(null)}>
          <div
            className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-sm">Payload do evento</h3>
              <button onClick={() => setView(null)} className="p-1 rounded hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>
            <pre className="p-5 text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(view.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}