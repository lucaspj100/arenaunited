import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchFinancialSettings,
  updateFinancialSettings,
  fetchSellerFinancialSettings,
  upsertSellerFinancialSettings,
  type FinancialSettings,
  type SellerFinancialSettings,
} from "@/lib/financialSettings";
import { supabase } from "@/integrations/supabase/client";
import { getAccessibleSellerIds } from "@/lib/access";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const Route = createFileRoute("/financeiro/config")({
  component: ConfigPage,
});

type SellerLite = { id: string; name: string };

function ConfigPage() {
  const { isStaff } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [costs, setCosts] = useState<Record<string, SellerFinancialSettings>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ids = await getAccessibleSellerIds();
      const [s, sellersRes, costsRows] = await Promise.all([
        fetchFinancialSettings(),
        supabase.from("sellers").select("id,name").order("name"),
        fetchSellerFinancialSettings(ids ?? undefined),
      ]);
      if (!mounted) return;
      setSettings(s);
      const allSellers = (sellersRes.data ?? []) as SellerLite[];
      setSellers(ids === null ? allSellers : allSellers.filter((x) => ids.includes(x.id)));
      const map: Record<string, SellerFinancialSettings> = {};
      for (const c of costsRows) map[c.sellerId] = c;
      setCosts(map);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveGlobal = async () => {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateFinancialSettings(settings.id, settings);
      setMsg("Salvo!");
    } catch (e) {
      setMsg("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveSeller = async (sellerId: string) => {
    const c = costs[sellerId] ?? {
      sellerId,
      monthlyAutomationCost: 0,
      monthlyToolsCost: 0,
      financialNotes: null,
      activeForFinancialAnalysis: true,
    };
    setSaving(true);
    setMsg(null);
    try {
      await upsertSellerFinancialSettings(c);
      setMsg("Custo do vendedor salvo!");
    } catch (e) {
      setMsg("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {msg && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">{msg}</div>
      )}

      <section>
        <h2 className="font-display font-bold text-lg mb-3">
          Configurações globais {isStaff ? "" : "(somente leitura)"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(
            [
              ["averageLifetimeMonths", "Tempo médio de vida (meses)", "number"],
              ["contractDurationMonths", "Duração do contrato (meses)", "number"],
              ["cancellationRate", "Taxa de cancelamento (0–1)", "number"],
              ["generalAutomationCost", "Custo automações (R$)", "number"],
              ["generalToolsCost", "Custo ferramentas (R$)", "number"],
              ["paidTrafficCost", "Tráfego pago (R$)", "number"],
              ["otherCommercialCosts", "Outros custos (R$)", "number"],
              ["defaultEnrollmentFeeValue", "Taxa de matrícula", "number"],
              ["defaultSchoolRetentionPercentage", "Retenção da escola (0–1)", "number"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
              <input
                type="number"
                step="0.01"
                disabled={!isStaff}
                value={settings[key] as number}
                onChange={(e) =>
                  setSettings({ ...settings, [key]: Number(e.target.value) })
                }
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
          ))}
          <label className="block">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Tipo de taxa de matrícula
            </div>
            <select
              disabled={!isStaff}
              value={settings.defaultEnrollmentFeeType}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultEnrollmentFeeType: e.target.value as "fixed" | "percent",
                })
              }
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="fixed">Fixo (R$)</option>
              <option value="percent">Percentual (0–1)</option>
            </select>
          </label>
        </div>
        {isStaff && (
          <button
            onClick={saveGlobal}
            disabled={saving}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar globais"}
          </button>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Custos por vendedor</h2>
        <div className="space-y-2">
          {sellers.map((s) => {
            const c = costs[s.id] ?? {
              sellerId: s.id,
              monthlyAutomationCost: 0,
              monthlyToolsCost: 0,
              financialNotes: null,
              activeForFinancialAnalysis: true,
            };
            return (
              <div
                key={s.id}
                className="grid grid-cols-1 md:grid-cols-5 items-end gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="md:col-span-1 font-semibold">{s.name}</div>
                <label className="block">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Automação (R$/mês)
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={c.monthlyAutomationCost}
                    onChange={(e) =>
                      setCosts({
                        ...costs,
                        [s.id]: { ...c, monthlyAutomationCost: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-input border border-border rounded-lg px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Ferramentas (R$/mês)
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={c.monthlyToolsCost}
                    onChange={(e) =>
                      setCosts({
                        ...costs,
                        [s.id]: { ...c, monthlyToolsCost: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-input border border-border rounded-lg px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={c.activeForFinancialAnalysis}
                    onChange={(e) =>
                      setCosts({
                        ...costs,
                        [s.id]: { ...c, activeForFinancialAnalysis: e.target.checked },
                      })
                    }
                  />
                  Ativo
                </label>
                <button
                  onClick={() => saveSeller(s.id)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
