import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PeriodPicker } from "@/components/PeriodPicker";
import { getPeriodRange, type PeriodKey, ROLE_LABELS } from "@/lib/commissions";
import { fetchEnrollments } from "@/lib/enrollments";
import {
  fetchFinancialSettings,
  fetchSellerFinancialSettings,
  type FinancialSettings,
  type SellerFinancialSettings,
} from "@/lib/financialSettings";
import { computeScopeKpis } from "@/lib/financial";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/financial/KpiCard";
import type { SellerRole } from "@/lib/commissions";

export const Route = createFileRoute("/financeiro/vendedor/$sellerId")({
  component: VendedorFinPage,
});

type SellerLite = { id: string; name: string; role: SellerRole };

function VendedorFinPage() {
  const { sellerId } = Route.useParams();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState(() => {
    const r = getPeriodRange("month");
    return { from: r.from, to: r.to };
  });
  const range = useMemo(() => getPeriodRange(periodKey, custom), [periodKey, custom]);

  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerLite | null>(null);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [costs, setCosts] = useState<SellerFinancialSettings[]>([]);
  const [enrollments, setEnrollments] = useState<Awaited<ReturnType<typeof fetchEnrollments>>>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const [sRes, s, c, rows] = await Promise.all([
        supabase.from("sellers").select("id,name,role").eq("id", sellerId).maybeSingle(),
        fetchFinancialSettings(),
        fetchSellerFinancialSettings([sellerId]),
        fetchEnrollments({ sellerId, from: range.from, to: range.to, status: "approved" }),
      ]);
      if (!mounted) return;
      setSeller((sRes.data as SellerLite) ?? null);
      setSettings(s);
      setCosts(c);
      setEnrollments(rows);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [sellerId, range.from, range.to]);

  const kpis = useMemo(() => {
    if (!settings) return null;
    return computeScopeKpis(enrollments, settings, costs, { includeGeneralCosts: false });
  }, [enrollments, settings, costs]);

  if (loading || !kpis || !seller) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link
            to="/financeiro/equipes"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Voltar à lista
          </Link>
          <h2 className="font-display font-bold text-xl mt-1">
            {seller.name}{" "}
            <span className="text-xs uppercase tracking-wider text-muted-foreground ml-2">
              {ROLE_LABELS[seller.role]}
            </span>
          </h2>
        </div>
        <PeriodPicker
          value={periodKey}
          custom={custom}
          onChange={(k, c) => {
            setPeriodKey(k);
            setCustom(c);
          }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard label="Matrículas" value={kpis.enrollmentsApproved} format="int" tone="primary" />
        <KpiCard label="Receita bruta" value={kpis.grossEnrollmentRevenue} />
        <KpiCard label="MRR novo" value={kpis.newMRR} tone="success" />
        <KpiCard label="Comissão" value={kpis.totalCommission} tone="warning" />
        <KpiCard label="Receita líquida" value={kpis.netEnrollmentRevenue} tone="success" />
        <KpiCard label="LTV ajustado" value={kpis.totalLTVAdjusted} />
        <KpiCard label="Receita esperada" value={kpis.totalExpectedRevenue} tone="primary" />
        <KpiCard label="Custos individuais" value={kpis.individualCostsTotal} tone="warning" />
        <KpiCard
          label="ROI"
          value={kpis.roi}
          format="ratio"
          tone={kpis.roi === null ? "default" : kpis.roi >= 2 ? "success" : kpis.roi >= 1 ? "warning" : "danger"}
          hint={kpis.roi === null ? "Sem custo informado" : undefined}
        />
      </div>
    </div>
  );
}
