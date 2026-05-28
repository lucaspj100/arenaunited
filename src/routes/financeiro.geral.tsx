import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PeriodPicker } from "@/components/PeriodPicker";
import { getPeriodRange, type PeriodKey } from "@/lib/commissions";
import { fetchEnrollments } from "@/lib/enrollments";
import {
  fetchFinancialSettings,
  fetchSellerFinancialSettings,
  fetchTeamFinancialSettings,
  mergeWithTeam,
  type FinancialSettings,
  type SellerFinancialSettings,
} from "@/lib/financialSettings";
import { computeScopeKpis } from "@/lib/financial";
import { getAccessibleSellerIds } from "@/lib/access";
import { KpiCard } from "@/components/financial/KpiCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const Route = createFileRoute("/financeiro/geral")({
  component: GeralPage,
});

function GeralPage() {
  const { isStaff, isManager, userId } = useCurrentUser();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState(() => {
    const r = getPeriodRange("month");
    return { from: r.from, to: r.to };
  });
  const range = useMemo(() => getPeriodRange(periodKey, custom), [periodKey, custom]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [sellerCosts, setSellerCosts] = useState<SellerFinancialSettings[]>([]);
  const [enrollments, setEnrollments] = useState<Awaited<ReturnType<typeof fetchEnrollments>>>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const ids = await getAccessibleSellerIds();
        const [globalS, team, costs, rows] = await Promise.all([
          fetchFinancialSettings(),
          userId && isManager && !isStaff
            ? fetchTeamFinancialSettings(userId)
            : Promise.resolve(null),
          fetchSellerFinancialSettings(ids ?? undefined),
          fetchEnrollments({ from: range.from, to: range.to, status: "approved" }),
        ]);
        if (!mounted) return;
        const filtered = ids === null ? rows : rows.filter((r) => ids.includes(r.sellerId));
        setSettings(mergeWithTeam(globalS, team));
        setSellerCosts(costs);
        setEnrollments(filtered);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [range.from, range.to, userId, isManager, isStaff]);

  const kpis = useMemo(() => {
    if (!settings) return null;
    return computeScopeKpis(enrollments, settings, sellerCosts, {
      includeGeneralCosts: true,
    });
  }, [enrollments, settings, sellerCosts, isStaff]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg">{range.label}</h2>
        <PeriodPicker
          value={periodKey}
          custom={custom}
          onChange={(k, c) => {
            setPeriodKey(k);
            setCustom(c);
          }}
        />
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {loading || !kpis ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Matrículas aprovadas" value={kpis.enrollmentsApproved} format="int" tone="primary" hint="Status = aprovada no período." />
          <KpiCard label="Receita bruta" value={kpis.grossEnrollmentRevenue} hint="Soma de enrollment_value." />
          <KpiCard label="Receita líquida" value={kpis.netEnrollmentRevenue} tone="success" hint="Bruta − comissão − taxa de matrícula." />
          <KpiCard label="MRR novo" value={kpis.newMRR} tone="success" hint="Soma das mensalidades aprovadas no período." />
          <KpiCard label="LTV total" value={kpis.totalLTV} hint={`Mensalidade × ${settings!.averageLifetimeMonths} meses.`} />
          <KpiCard label="LTV ajustado" value={kpis.totalLTVAdjusted} hint={`LTV × (1 − ${(settings!.cancellationRate * 100).toFixed(0)}% cancelamento).`} />
          <KpiCard label="Receita esperada" value={kpis.totalExpectedRevenue} tone="primary" hint="Receita líquida + LTV ajustado." />
          <KpiCard label="Comissão total" value={kpis.totalCommission} tone="warning" hint="Soma das comissões pagas." />
          <KpiCard label="Salários" value={kpis.salariesTotal} tone="warning" hint="Soma dos salários ativos." />
          <KpiCard label="Ferramentas" value={kpis.generalToolsCost} tone="warning" hint="Custo geral mensal." />
          <KpiCard label="Tráfego pago" value={kpis.paidTrafficCost} tone="warning" hint="Mídia paga mensal." />
          <KpiCard label="Outros custos" value={kpis.otherCommercialCosts} tone="warning" hint="Outros custos comerciais." />
          <KpiCard label="Custos individuais" value={kpis.individualCostsTotal} tone="warning" hint="Salários + ferramentas + outros por vendedor." />
          <KpiCard label="Custo total" value={kpis.totalInvestment} tone="danger" hint="Soma de todos os custos do escopo." />
          {kpis.totalInvestment > 0 ? (
            <>
              <KpiCard label="CAC" value={kpis.cac} tone={kpis.cac && kpis.cac > 1000 ? "danger" : "primary"} hint={kpis.cac === null ? "Sem matrículas no período." : "Custo total ÷ matrículas aprovadas."} />
              <KpiCard
                label="ROI"
                value={kpis.roi}
                format="ratio"
                tone={kpis.roi === null ? "default" : kpis.roi >= 2 ? "success" : kpis.roi >= 1 ? "warning" : "danger"}
                hint="Receita esperada ÷ custo total."
              />
            </>
          ) : (
            <div className="col-span-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
              Cadastre salários e custos para calcular CAC e ROI.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
