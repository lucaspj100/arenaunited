import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PeriodPicker } from "@/components/PeriodPicker";
import { getPeriodRange, type PeriodKey, formatBRL, ROLE_LABELS } from "@/lib/commissions";
import { fetchEnrollments } from "@/lib/enrollments";
import {
  fetchFinancialSettings,
  fetchSellerFinancialSettings,
  fetchTeamFinancialSettings,
  mergeWithTeam,
  type FinancialSettings,
  type SellerFinancialSettings,
} from "@/lib/financialSettings";
import { computeScopeKpis, groupBySeller } from "@/lib/financial";
import { supabase } from "@/integrations/supabase/client";
import { getAccessibleSellerIds } from "@/lib/access";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { SellerRole } from "@/lib/commissions";

export const Route = createFileRoute("/financeiro/equipes")({
  component: EquipesPage,
});

type SellerLite = { id: string; name: string; role: SellerRole };

function EquipesPage() {
  const { isStaff, isManager, userId } = useCurrentUser();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState(() => {
    const r = getPeriodRange("month");
    return { from: r.from, to: r.to };
  });
  const range = useMemo(() => getPeriodRange(periodKey, custom), [periodKey, custom]);

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [sellerCosts, setSellerCosts] = useState<SellerFinancialSettings[]>([]);
  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [enrollments, setEnrollments] = useState<Awaited<ReturnType<typeof fetchEnrollments>>>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const ids = await getAccessibleSellerIds();
        const [globalS, team, costs, rows, sellersRes] = await Promise.all([
          fetchFinancialSettings(),
          userId && isManager && !isStaff
            ? fetchTeamFinancialSettings(userId)
            : Promise.resolve(null),
          fetchSellerFinancialSettings(ids ?? undefined),
          fetchEnrollments({ from: range.from, to: range.to, status: "approved" }),
          supabase.from("sellers").select("id,name,role"),
        ]);
        if (!mounted) return;
        setSettings(mergeWithTeam(globalS, team));
        setSellerCosts(costs);
        const allSellers = (sellersRes.data ?? []) as SellerLite[];
        const filteredSellers = ids === null ? allSellers : allSellers.filter((x) => ids.includes(x.id));
        setSellers(filteredSellers);
        const filtered = ids === null ? rows : rows.filter((r) => ids.includes(r.sellerId));
        setEnrollments(filtered);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [range.from, range.to, userId, isManager, isStaff]);

  const rows = useMemo(() => {
    if (!settings) return [];
    const grouped = groupBySeller(enrollments);
    return sellers
      .map((s) => {
        const items = grouped.get(s.id) ?? [];
        const costs = sellerCosts.filter((c) => c.sellerId === s.id);
        const k = computeScopeKpis(items, settings, costs, { includeGeneralCosts: false });
        return { seller: s, k };
      })
      .sort((a, b) => b.k.totalExpectedRevenue - a.k.totalExpectedRevenue);
  }, [enrollments, sellers, sellerCosts, settings]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg">
          {isStaff ? "Todos os vendedores" : "Minha equipe"} · {range.label}
        </h2>
        <PeriodPicker
          value={periodKey}
          custom={custom}
          onChange={(k, c) => {
            setPeriodKey(k);
            setCustom(c);
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Vendedor</th>
              <th className="text-right px-3 py-2">Matrículas</th>
              <th className="text-right px-3 py-2">MRR novo</th>
              <th className="text-right px-3 py-2">Receita líquida</th>
              <th className="text-right px-3 py-2">LTV ajustado</th>
              <th className="text-right px-3 py-2">Receita esperada</th>
              <th className="text-right px-3 py-2">Custos</th>
              <th className="text-right px-3 py-2">ROI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ seller, k }) => (
              <tr key={seller.id} className="border-t border-border hover:bg-secondary/20">
                <td className="px-3 py-2">
                  <Link
                    to="/financeiro/vendedor/$sellerId"
                    params={{ sellerId: seller.id }}
                    className="font-semibold hover:underline"
                  >
                    {seller.name}
                  </Link>
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {ROLE_LABELS[seller.role]}
                  </span>
                </td>
                <td className="text-right px-3 py-2">{k.enrollmentsApproved}</td>
                <td className="text-right px-3 py-2">{formatBRL(k.newMRR)}</td>
                <td className="text-right px-3 py-2">{formatBRL(k.netEnrollmentRevenue)}</td>
                <td className="text-right px-3 py-2">{formatBRL(k.totalLTVAdjusted)}</td>
                <td className="text-right px-3 py-2 font-semibold">{formatBRL(k.totalExpectedRevenue)}</td>
                <td className="text-right px-3 py-2 text-amber-600">{formatBRL(k.individualCostsTotal)}</td>
                <td className={`text-right px-3 py-2 font-semibold ${k.roi === null ? "" : k.roi >= 2 ? "text-emerald-600" : k.roi >= 1 ? "text-amber-600" : "text-destructive"}`}>
                  {k.roi === null ? "—" : `${k.roi.toFixed(2)}x`}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground px-3 py-6">
                  Nenhum vendedor no escopo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
