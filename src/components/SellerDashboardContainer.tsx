import { useEffect, useMemo, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSellers } from "@/lib/storage";
import { Seller, rankSellers, DEFAULT_WEIGHTS } from "@/lib/ranking";
import { fetchEnrollments, Enrollment } from "@/lib/enrollments";
import { fetchInterviews, Interview } from "@/lib/interviews";
import { PeriodKey, getPeriodRange, getPreviousRange } from "@/lib/commissions";
import { PeriodPicker } from "@/components/PeriodPicker";
import { SellerDashboard } from "@/components/SellerDashboard";
import { MotivationCard } from "@/components/MotivationCard";
import { RitualDoDia } from "@/components/RitualDoDia";
import { RivalCard } from "@/components/RivalCard";
import { StreakBadge } from "@/components/StreakBadge";
import { WeeklyReplayModal } from "@/components/WeeklyReplayModal";
import { SafeBlock } from "@/components/SafeBlock";
import { classifyPerformance } from "@/lib/motivation";
import { buildRitual } from "@/lib/ritual";
import { computeStreak } from "@/lib/streak";
import { buildWeeklyRecap, isFriday } from "@/lib/weeklyRecap";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sixtyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 60);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SellerDashboardContainer({
  sellerId,
  showMotivation,
  headerExtras,
}: {
  sellerId: string;
  showMotivation: boolean;
  headerExtras?: React.ReactNode;
}) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [prevEnrollments, setPrevEnrollments] = useState<Enrollment[]>([]);
  const [prevInterviews, setPrevInterviews] = useState<Interview[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Histórico de 60 dias — base para streak, ritual e replay semanal
  const [enrollments60d, setEnrollments60d] = useState<Enrollment[]>([]);
  const [interviews60d, setInterviews60d] = useState<Interview[]>([]);
  const [replayOpen, setReplayOpen] = useState(false);

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState(() => {
    const t = todayISO();
    return { from: t, to: t };
  });
  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);
  const prevRange = useMemo(() => getPreviousRange(range), [range]);

  useEffect(() => {
    let mounted = true;
    fetchSellers()
      .then((d) => mounted && setSellers(d))
      .catch((e) => mounted && setError(e.message))
      .finally(() => mounted && setLoadingSellers(false));
    const ch = supabase
      .channel(`seller-dash-${sellerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, () => {
        fetchSellers().then((d) => mounted && setSellers(d)).catch(() => {});
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments", filter: `seller_id=eq.${sellerId}` },
        () => {
          reloadPeriodData();
          reload60d();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interviews", filter: `seller_id=eq.${sellerId}` },
        () => {
          reloadPeriodData();
          reload60d();
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const reloadPeriodData = async () => {
    const [e1, i1, e2, i2] = await Promise.all([
      fetchEnrollments({ sellerId, from: range.from, to: range.to }),
      fetchInterviews({ sellerId, from: range.from, to: range.to }),
      fetchEnrollments({ sellerId, from: prevRange.from, to: prevRange.to }),
      fetchInterviews({ sellerId, from: prevRange.from, to: prevRange.to }),
    ]);
    setEnrollments(e1);
    setInterviews(i1);
    setPrevEnrollments(e2);
    setPrevInterviews(i2);
  };

  const reload60d = async () => {
    if (!showMotivation) return;
    const from = sixtyDaysAgoISO();
    const to = todayISO();
    const [e, i] = await Promise.all([
      fetchEnrollments({ sellerId, from, to }),
      fetchInterviews({ sellerId, from, to }),
    ]);
    setEnrollments60d(e);
    setInterviews60d(i);
  };

  // Carrega janela de 60 dias para ritual/streak/replay (só pro dono do dashboard)
  useEffect(() => {
    if (!showMotivation) return;
    let mounted = true;
    const from = sixtyDaysAgoISO();
    const to = todayISO();
    Promise.all([
      fetchEnrollments({ sellerId, from, to }),
      fetchInterviews({ sellerId, from, to }),
    ])
      .then(([e, i]) => {
        if (!mounted) return;
        setEnrollments60d(e);
        setInterviews60d(i);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [sellerId, showMotivation]);

  useEffect(() => {
    let mounted = true;
    setLoadingData(true);
    Promise.all([
      fetchEnrollments({ sellerId, from: range.from, to: range.to }),
      fetchInterviews({ sellerId, from: range.from, to: range.to }),
      fetchEnrollments({ sellerId, from: prevRange.from, to: prevRange.to }),
      fetchInterviews({ sellerId, from: prevRange.from, to: prevRange.to }),
    ])
      .then(([e1, i1, e2, i2]) => {
        if (!mounted) return;
        setEnrollments(e1);
        setInterviews(i1);
        setPrevEnrollments(e2);
        setPrevInterviews(i2);
      })
      .catch((e) => mounted && setError(e.message))
      .finally(() => mounted && setLoadingData(false));
    return () => {
      mounted = false;
    };
  }, [sellerId, range.from, range.to, prevRange.from, prevRange.to]);

  const seller = sellers.find((s) => s.id === sellerId) ?? null;
  const ranked = useMemo(() => rankSellers(sellers, DEFAULT_WEIGHTS), [sellers]);
  const rank = useMemo(() => {
    const i = ranked.findIndex((s) => s.id === sellerId);
    return i === -1 ? null : i + 1;
  }, [ranked, sellerId]);
  const isCurrentMonth = useMemo(() => {
    const monthRange = getPeriodRange("month");
    return range.from === monthRange.from && range.to === monthRange.to;
  }, [range.from, range.to]);

  const tier = useMemo(() => {
    if (!seller || !rank) return "neutral" as const;
    return classifyPerformance({
      rank,
      total: Math.max(sellers.length, 1),
      deals: seller.deals,
      goalDeals: seller.goalDeals,
    });
  }, [seller, rank, sellers.length]);

  const ritual = useMemo(() => {
    if (!seller || !showMotivation) return null;
    return buildRitual({
      seller,
      tier,
      enrollments60d,
      interviews60d,
    });
  }, [seller, tier, enrollments60d, interviews60d, showMotivation]);

  const streak = useMemo(() => {
    if (!showMotivation) return 0;
    const dates = new Set<string>();
    for (const e of enrollments60d) {
      if (e.status === "approved") dates.add(e.enrollmentDate);
    }
    for (const i of interviews60d) dates.add(i.scheduledDate);
    return computeStreak(dates);
  }, [enrollments60d, interviews60d, showMotivation]);

  const recap = useMemo(() => {
    if (!seller || !showMotivation) return null;
    return buildWeeklyRecap({
      seller,
      rank,
      totalSellers: sellers.length,
      enrollments60d,
    });
  }, [seller, rank, sellers.length, enrollments60d, showMotivation]);

  // Auto-abrir replay nas sextas-feiras (uma vez por semana, por vendedor)
  useEffect(() => {
    if (!showMotivation || !recap) return;
    if (!isFriday()) return;
    const key = `replay_seen_${sellerId}_${recap.weekStartKey}`;
    if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
      setReplayOpen(true);
      window.localStorage.setItem(key, "1");
    }
  }, [showMotivation, recap, sellerId]);

  if (loadingSellers) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        Vendedor não encontrado.
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">{headerExtras}</div>
        <PeriodPicker
          value={period}
          custom={custom}
          onChange={(k, c) => {
            setPeriod(k);
            setCustom(c);
          }}
        />
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loadingData ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando dados do período…
        </div>
      ) : (
        <SellerDashboard
          seller={seller}
          rank={rank}
          totalSellers={sellers.length}
          range={range}
          isCurrentMonth={isCurrentMonth}
          enrollmentsCurrent={enrollments}
          interviewsCurrent={interviews}
          enrollmentsPrevious={prevEnrollments}
          interviewsPrevious={prevInterviews}
          mode={showMotivation ? tier : undefined}
          headerSlot={
            showMotivation && streak > 0 ? (
              <SafeBlock name="StreakBadge">
                <StreakBadge streak={streak} />
              </SafeBlock>
            ) : undefined
          }
          topSlot={
            showMotivation ? (
              <div className="space-y-4">
                {recap && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setReplayOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Play className="size-3" />
                      Ver recap da semana
                    </button>
                  </div>
                )}
                <SafeBlock name="RivalCard">
                  <RivalCard rank={rank} ranked={ranked} sellerId={sellerId} />
                </SafeBlock>
                <SafeBlock name="MotivationCard">
                  <MotivationCard sellerId={sellerId} rankedSellers={ranked} />
                </SafeBlock>
                {ritual && (
                  <SafeBlock name="RitualDoDia">
                    <RitualDoDia plan={ritual} />
                  </SafeBlock>
                )}
              </div>
            ) : undefined
          }
        />
      )}
      {showMotivation && recap && (
        <SafeBlock name="WeeklyReplayModal" fallback={null}>
          <WeeklyReplayModal
            open={replayOpen}
            slides={recap.slides}
            onClose={() => setReplayOpen(false)}
          />
        </SafeBlock>
      )}
    </>
  );
}