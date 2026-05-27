import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSellers } from "@/lib/storage";
import { Seller, rankSellers, DEFAULT_WEIGHTS } from "@/lib/ranking";
import { fetchEnrollments, Enrollment } from "@/lib/enrollments";
import { fetchInterviews, Interview } from "@/lib/interviews";
import { PeriodKey, getPeriodRange, getPreviousRange } from "@/lib/commissions";
import { PeriodPicker } from "@/components/PeriodPicker";
import { SellerDashboard } from "@/components/SellerDashboard";
import { MotivationCard } from "@/components/MotivationCard";

function todayISO() {
  const d = new Date();
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
        () => reloadPeriodData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interviews", filter: `seller_id=eq.${sellerId}` },
        () => reloadPeriodData(),
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
          topSlot={
            showMotivation ? (
              <MotivationCard sellerId={sellerId} rankedSellers={ranked} />
            ) : undefined
          }
        />
      )}
    </>
  );
}