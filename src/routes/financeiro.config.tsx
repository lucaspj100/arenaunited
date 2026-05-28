import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchFinancialSettings,
  updateFinancialSettings,
  fetchSellerFinancialSettings,
  upsertSellerFinancialSettings,
  fetchTeamFinancialSettings,
  upsertTeamFinancialSettings,
  type FinancialSettings,
  type SellerFinancialSettings,
  type TeamFinancialSettings,
} from "@/lib/financialSettings";
import { supabase } from "@/integrations/supabase/client";
import { getAccessibleSellerIds } from "@/lib/access";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const Route = createFileRoute("/financeiro/config")({
  component: ConfigPage,
});

type SellerLite = { id: string; name: string };

const EMPTY_TEAM = (uid: string): TeamFinancialSettings => ({
  id: "",
  managerUserId: uid,
  averageLifetimeMonths: 8,
  contractDurationMonths: 18,
  cancellationRate: 0.1,
  enrollmentFeeType: "fixed",
  enrollmentFeeValue: 0,
  schoolRetentionPercentage: 0,
  generalToolsCost: 0,
  paidTrafficCost: 0,
  otherCommercialCosts: 0,
});

const emptyCost = (sellerId: string): SellerFinancialSettings => ({
  sellerId,
  monthlySalary: 0,
  monthlyToolsCost: 0,
  otherIndividualCosts: 0,
  financialNotes: null,
  activeForFinancialAnalysis: true,
});

function ConfigPage() {
  const { isStaff, isManager, userId } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<FinancialSettings | null>(null);
  const [team, setTeam] = useState<TeamFinancialSettings | null>(null);
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
      let t: TeamFinancialSettings | null = null;
      if (userId && isManager && !isStaff) {
        t = await fetchTeamFinancialSettings(userId);
        if (!t) t = EMPTY_TEAM(userId);
      }
      if (!mounted) return;
      setGlobalSettings(s);
      setTeam(t);
      const allSellers = (sellersRes.data ?? []) as SellerLite[];
      setSellers(
        ids === null ? allSellers : allSellers.filter((x) => ids.includes(x.id)),
      );
      const map: Record<string, SellerFinancialSettings> = {};
      for (const c of costsRows) map[c.sellerId] = c;
      setCosts(map);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId, isManager, isStaff]);

  const saveGlobal = async () => {
    if (!globalSettings) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateFinancialSettings(globalSettings.id, globalSettings);
      setMsg("Configurações globais salvas.");
    } catch (e) {
      setMsg("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveTeam = async () => {
    if (!team || !userId) return;
    setSaving(true);
    setMsg(null);
    try {
      await upsertTeamFinancialSettings(userId, team);
      setMsg("Configurações da equipe salvas.");
    } catch (e) {
      setMsg("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveSeller = async (sellerId: string) => {
    const c = costs[sellerId] ?? emptyCost(sellerId);
    setSaving(true);
    setMsg(null);
    try {
      await upsertSellerFinancialSettings(c, userId ?? undefined);
      setMsg("Custos do vendedor salvos.");
    } catch (e) {
      setMsg("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !globalSettings) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {msg && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          {msg}
        </div>
      )}

      {/* ============ Configurações da minha escola/franquia ============ */}
      {team && (
        <section>
          <h2 className="font-display font-bold text-lg mb-1">
            Configurações da minha escola/franquia
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Esses valores valem só para a sua equipe. CAC, LTV e ROI da sua
            escola são calculados com base neles.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumberField
              label="LTV — tempo médio de permanência (meses)"
              value={team.averageLifetimeMonths}
              onChange={(v) => setTeam({ ...team, averageLifetimeMonths: v })}
            />
            <NumberField
              label="Duração do contrato (meses)"
              value={team.contractDurationMonths}
              onChange={(v) => setTeam({ ...team, contractDurationMonths: v })}
            />
            <NumberField
              label="Taxa de cancelamento (0–1)"
              step={0.01}
              value={team.cancellationRate}
              onChange={(v) => setTeam({ ...team, cancellationRate: v })}
            />
            <SelectField
              label="Tipo de taxa de matrícula"
              value={team.enrollmentFeeType}
              options={[
                { value: "fixed", label: "Fixo (R$)" },
                { value: "percent", label: "Percentual (0–1)" },
              ]}
              onChange={(v) =>
                setTeam({ ...team, enrollmentFeeType: v as "fixed" | "percent" })
              }
            />
            <NumberField
              label="Valor da taxa de matrícula"
              step={0.01}
              value={team.enrollmentFeeValue}
              onChange={(v) => setTeam({ ...team, enrollmentFeeValue: v })}
            />
            <NumberField
              label="Retenção da escola (0–1)"
              step={0.01}
              value={team.schoolRetentionPercentage}
              onChange={(v) => setTeam({ ...team, schoolRetentionPercentage: v })}
            />
            <NumberField
              label="Ferramentas (R$/mês)"
              step={0.01}
              value={team.generalToolsCost}
              onChange={(v) => setTeam({ ...team, generalToolsCost: v })}
            />
            <NumberField
              label="Tráfego pago (R$/mês)"
              step={0.01}
              value={team.paidTrafficCost}
              onChange={(v) => setTeam({ ...team, paidTrafficCost: v })}
            />
            <NumberField
              label="Outros custos comerciais (R$/mês)"
              step={0.01}
              value={team.otherCommercialCosts}
              onChange={(v) => setTeam({ ...team, otherCommercialCosts: v })}
            />
          </div>
          <button
            onClick={saveTeam}
            disabled={saving}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar configurações da equipe"}
          </button>
        </section>
      )}

      {/* ============ Defaults da rede (apenas staff) ============ */}
      {isStaff && (
        <section>
          <h2 className="font-display font-bold text-lg mb-1">
            Padrões da rede (fallback)
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Usados quando a escola não configurou os próprios valores.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumberField
              label="LTV padrão (meses)"
              value={globalSettings.averageLifetimeMonths}
              onChange={(v) =>
                setGlobalSettings({ ...globalSettings, averageLifetimeMonths: v })
              }
            />
            <NumberField
              label="Duração do contrato (meses)"
              value={globalSettings.contractDurationMonths}
              onChange={(v) =>
                setGlobalSettings({ ...globalSettings, contractDurationMonths: v })
              }
            />
            <NumberField
              label="Taxa de cancelamento (0–1)"
              step={0.01}
              value={globalSettings.cancellationRate}
              onChange={(v) =>
                setGlobalSettings({ ...globalSettings, cancellationRate: v })
              }
            />
            <NumberField
              label="Ferramentas (R$/mês)"
              step={0.01}
              value={globalSettings.generalToolsCost}
              onChange={(v) =>
                setGlobalSettings({ ...globalSettings, generalToolsCost: v })
              }
            />
            <NumberField
              label="Tráfego pago (R$/mês)"
              step={0.01}
              value={globalSettings.paidTrafficCost}
              onChange={(v) =>
                setGlobalSettings({ ...globalSettings, paidTrafficCost: v })
              }
            />
            <NumberField
              label="Outros custos (R$/mês)"
              step={0.01}
              value={globalSettings.otherCommercialCosts}
              onChange={(v) =>
                setGlobalSettings({ ...globalSettings, otherCommercialCosts: v })
              }
            />
            <SelectField
              label="Tipo de taxa de matrícula"
              value={globalSettings.defaultEnrollmentFeeType}
              options={[
                { value: "fixed", label: "Fixo (R$)" },
                { value: "percent", label: "Percentual (0–1)" },
              ]}
              onChange={(v) =>
                setGlobalSettings({
                  ...globalSettings,
                  defaultEnrollmentFeeType: v as "fixed" | "percent",
                })
              }
            />
            <NumberField
              label="Valor da taxa de matrícula"
              step={0.01}
              value={globalSettings.defaultEnrollmentFeeValue}
              onChange={(v) =>
                setGlobalSettings({
                  ...globalSettings,
                  defaultEnrollmentFeeValue: v,
                })
              }
            />
            <NumberField
              label="Retenção da escola (0–1)"
              step={0.01}
              value={globalSettings.defaultSchoolRetentionPercentage}
              onChange={(v) =>
                setGlobalSettings({
                  ...globalSettings,
                  defaultSchoolRetentionPercentage: v,
                })
              }
            />
          </div>
          <button
            onClick={saveGlobal}
            disabled={saving}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar padrões da rede"}
          </button>
        </section>
      )}

      {/* ============ Custos por vendedor (com salário) ============ */}
      <section>
        <h2 className="font-display font-bold text-lg mb-1">
          Salários e custos por vendedor
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Esses valores alimentam o cálculo de CAC e ROI individual e da equipe.
        </p>
        <div className="space-y-2">
          {sellers.map((s) => {
            const c = costs[s.id] ?? emptyCost(s.id);
            return (
              <div
                key={s.id}
                className="grid grid-cols-1 md:grid-cols-6 items-end gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="md:col-span-1 font-semibold">{s.name}</div>
                <NumberField
                  small
                  label="Salário (R$/mês)"
                  step={0.01}
                  value={c.monthlySalary}
                  onChange={(v) =>
                    setCosts({ ...costs, [s.id]: { ...c, monthlySalary: v } })
                  }
                />
                <NumberField
                  small
                  label="Ferramentas (R$/mês)"
                  step={0.01}
                  value={c.monthlyToolsCost}
                  onChange={(v) =>
                    setCosts({ ...costs, [s.id]: { ...c, monthlyToolsCost: v } })
                  }
                />
                <NumberField
                  small
                  label="Outros (R$/mês)"
                  step={0.01}
                  value={c.otherIndividualCosts}
                  onChange={(v) =>
                    setCosts({
                      ...costs,
                      [s.id]: { ...c, otherIndividualCosts: v },
                    })
                  }
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={c.activeForFinancialAnalysis}
                    onChange={(e) =>
                      setCosts({
                        ...costs,
                        [s.id]: {
                          ...c,
                          activeForFinancialAnalysis: e.target.checked,
                        },
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
          {sellers.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Nenhum vendedor no seu escopo. Vincule vendedores em “Minha
              equipe”.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  small,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  small?: boolean;
}) {
  return (
    <label className="block">
      <div
        className={`${small ? "text-[10px] uppercase tracking-wider" : "text-xs"} font-medium text-muted-foreground mb-1`}
      >
        {label}
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full bg-input border border-border rounded-lg ${small ? "px-2 py-1.5" : "px-3 py-2"} text-sm`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}