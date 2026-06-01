import { useEffect, useMemo, useState } from "react";
import { Loader2, Copy, Trophy } from "lucide-react";
import {
  fetchRankingHistory,
  fetchAvailableMonths,
  closeMonthlyRanking,
  MONTH_LABELS_PT,
  type RankingSnapshot,
} from "@/lib/monthlyRanking";
import { fetchSellers } from "@/lib/storage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Seller } from "@/lib/ranking";

function now() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function previousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function RankingHistory() {
  const { role, isStaff, isManager, sellerId, userId } = useCurrentUser();
  const isAdmin = role === "admin";
  const isSeller = role === "vendedor" && !isManager;

  const prev = previousMonth();
  const [year, setYear] = useState<number>(prev.year);
  const [month, setMonth] = useState<number>(prev.month);
  const [sellerFilter, setSellerFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<"" | "consultor" | "gerente">("");
  const [snapshots, setSnapshots] = useState<RankingSnapshot[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<{ year: number; month: number }[]>([]);

  useEffect(() => {
    fetchAvailableMonths().then(setAvailableMonths).catch(() => setAvailableMonths([]));
    fetchSellers().then(setSellers).catch(() => setSellers([]));
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const filters: Parameters<typeof fetchRankingHistory>[0] = { year, month };
    if (isSeller && sellerId) filters.sellerId = sellerId;
    else if (sellerFilter) filters.sellerId = sellerFilter;
    if (roleFilter) filters.role = roleFilter;
    fetchRankingHistory(filters)
      .then((d) => mounted && setSnapshots(d))
      .catch((e) => {
        console.error(e);
        mounted && setSnapshots([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [year, month, sellerFilter, roleFilter, isSeller, sellerId]);

  const years = useMemo(() => {
    const cur = now().year;
    const set = new Set<number>([cur, cur - 1]);
    for (const m of availableMonths) set.add(m.year);
    return Array.from(set).sort((a, b) => b - a);
  }, [availableMonths]);

  const reprocess = async () => {
    if (!isAdmin) return;
    if (!confirm(`Reprocessar snapshot de ${MONTH_LABELS_PT[month - 1]}/${year}?`)) return;
    setReprocessing(true);
    try {
      await closeMonthlyRanking(year, month);
      const filters: Parameters<typeof fetchRankingHistory>[0] = { year, month };
      if (sellerFilter) filters.sellerId = sellerFilter;
      if (roleFilter) filters.role = roleFilter;
      const d = await fetchRankingHistory(filters);
      setSnapshots(d);
    } catch (e) {
      alert("Erro ao reprocessar: " + ((e as Error).message ?? "erro"));
    } finally {
      setReprocessing(false);
    }
  };

  const copyCsv = () => {
    const header = [
      "Posição",
      "Vendedor",
      "Cargo",
      "Marcadas",
      "Realizadas",
      "Matrículas",
      "Conversão (%)",
      "Pontuação",
      "Material (R$)",
    ];
    const rows = snapshots.map((s) => [
      s.finalPosition,
      s.sellerName,
      s.role,
      s.totalScheduled,
      s.totalCompleted,
      s.totalEnrollments,
      s.conversionRate,
      s.totalScore,
      s.totalMaterial,
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    navigator.clipboard.writeText(csv).then(
      () => alert("Histórico copiado para a área de transferência."),
      () => alert("Não foi possível copiar."),
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1">Mês</div>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm"
          >
            {MONTH_LABELS_PT.map((label, i) => (
              <option key={i + 1} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1">Ano</div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg bg-input border border-border px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {!isSeller && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1">Vendedor</div>
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="rounded-lg bg-input border border-border px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">Todos</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isStaff && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1">Cargo</div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "" | "consultor" | "gerente")}
              className="rounded-lg bg-input border border-border px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="consultor">Consultor</option>
              <option value="gerente">Gerente</option>
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {(isManager || isStaff) && snapshots.length > 0 && (
            <button
              onClick={copyCsv}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
            >
              <Copy className="size-3.5" /> Copiar CSV
            </button>
          )}
          {isAdmin && (
            <button
              onClick={reprocess}
              disabled={reprocessing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {reprocessing && <Loader2 className="size-3.5 animate-spin" />}
              Reprocessar mês
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando histórico…
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
          Nenhum registro de ranking para {MONTH_LABELS_PT[month - 1]}/{year}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Pos.</th>
                <th className="text-left px-3 py-2">Vendedor</th>
                <th className="text-left px-3 py-2">Cargo</th>
                <th className="text-right px-3 py-2">Marcadas</th>
                <th className="text-right px-3 py-2">Realizadas</th>
                <th className="text-right px-3 py-2">Matrículas</th>
                <th className="text-right px-3 py-2">Conv. %</th>
                <th className="text-right px-3 py-2">Pontuação</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-3 py-2 font-display font-bold">
                    {s.finalPosition <= 3 ? (
                      <span className="inline-flex items-center gap-1 text-gold">
                        <Trophy className="size-3.5" /> {s.finalPosition}º
                      </span>
                    ) : (
                      `${s.finalPosition}º`
                    )}
                  </td>
                  <td className="px-3 py-2 font-semibold">{s.sellerName}</td>
                  <td className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.role}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">{s.totalScheduled}</td>
                  <td className="text-right px-3 py-2 tabular-nums">{s.totalCompleted}</td>
                  <td className="text-right px-3 py-2 tabular-nums font-semibold text-primary">
                    {s.totalEnrollments}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">{s.conversionRate}%</td>
                  <td className="text-right px-3 py-2 tabular-nums font-mono">{s.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}