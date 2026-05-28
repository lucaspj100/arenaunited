import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PeriodPicker } from "@/components/PeriodPicker";
import { getPeriodRange, type PeriodKey } from "@/lib/commissions";
import { fetchEnrollments } from "@/lib/enrollments";
import {
  fetchFinancialSettings,
  fetchSellerFinancialSettings,
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
  const { isStaff } = useCurrentUser();
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
        const [s, costs, rows] = await Promise.all([
          fetchFinancialSettings(),
          fetchSellerFinancialSettings(ids ?? undefined),
          fetchEnrollments({ from: range.from, to: range.to, status: "approved" }),
        ]);
        if (!mounted) return;
        const filtered = ids === null ? rows : rows.filter((r) => ids.includes(r.sellerId));
        setSettings(s);
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
  }, [range.from, range.to]);

  const kpis = useMemo(() => {
    if (!settings) return null;
    return computeScopeKpis(enrollments, settings, sellerCosts, {
      includeGeneralCosts: isStaff,
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
          <KpiCard label="Matrículas aprovadas" value={kpis.enrollmentsApproved} format="int" tone="primary" />
          <KpiCard label="Receita bruta" value={kpis.grossEnrollmentRevenue} />
          <KpiCard label="Receita líquida" value={kpis.netEnrollmentRevenue} tone="success" />
          <KpiCard label="MRR novo" value={kpis.newMRR} tone="success" />
          <KpiCard label="LTV total" value={kpis.totalLTV} />
          <KpiCard label="LTV ajustado" value={kpis.totalLTVAdjusted} hint={`Cancelamento ${(settings!.cancellationRate * 100).toFixed(0)}%`} />
          <KpiCard label="Receita esperada" value={kpis.totalExpectedRevenue} tone="primary" />
          <KpiCard label="Comissão total" value={kpis.totalCommission} tone="warning" />
          {isStaff && (
            <>
              <KpiCard label="Custo automações" value={kpis.generalAutomationCost} tone="warning" />
              <KpiCard label="Custo ferramentas" value={kpis.generalToolsCost} tone="warning" />
              <KpiCard label="Tráfego pago" value={kpis.paidTrafficCost} tone="warning" />
              <KpiCard label="Outros custos" value={kpis.otherCommercialCosts} tone="warning" />
            </>
          )}
          <KpiCard label="Custos individuais" value={kpis.individualCostsTotal} tone="warning" />
          <KpiCard label="Investimento total" value={kpis.totalInvestment} tone="danger" />
          <KpiCard label="CAC" value={kpis.cac} tone={kpis.cac && kpis.cac > 1000 ? "danger" : "primary"} hint={kpis.cac === null ? "Sem matrículas" : undefined} />
          <KpiCard
            label="ROI"
            value={kpis.roi}
            format="ratio"
            tone={kpis.roi === null ? "default" : kpis.roi >= 2 ? "success" : kpis.roi >= 1 ? "warning" : "danger"}
            hint={kpis.roi === null ? "Sem custo informado" : undefined}
          />
        </div>
      )}
    </div>
  );
}
