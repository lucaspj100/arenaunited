import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rankSellers, type Seller, type Weights } from "@/lib/ranking";
import { Sparkles, GraduationCap, ArrowUp, ArrowDown, Minus } from "lucide-react";

type Latest = {
  id: string;
  student_name: string;
  enrollment_value: number | string;
  material_value: number | string;
  enrollment_date: string;
  approved_at: string | null;
  seller_id: string;
  seller_name: string;
  seller_avatar: string | null;
  seller_role: "consultor" | "gerente";
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDateBR(iso: string) {
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

function ordinal(n: number) {
  return `${n}º`;
}

export function LatestEnrollmentSpotlight({
  sellers,
  weights,
}: {
  sellers: Seller[];
  weights: Weights;
}) {
  const [row, setRow] = useState<Latest | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      supabase
        .from("latest_approved_enrollment")
        .select(
          "id,student_name,enrollment_value,material_value,enrollment_date,approved_at,seller_id,seller_name,seller_avatar,seller_role",
        )
        .maybeSingle()
        .then(({ data, error }) => {
          if (!mounted) return;
          if (error) {
            console.warn("latest_approved_enrollment", error);
            return;
          }
          setRow(data as Latest | null);
        });
    };
    load();
    const channel = supabase
      .channel("latest-enrollment-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        () => load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!row) return null;

  const movement = (() => {
    const seller = sellers.find((s) => s.id === row.seller_id);
    if (!seller) return null;
    const currentRanked = rankSellers(sellers, weights);
    const currentRank =
      currentRanked.findIndex((s) => s.id === row.seller_id) + 1;
    if (currentRank === 0) return null;
    // Simulate "antes desta matrícula": remove 1 matrícula e o material desta venda
    const before = sellers.map((s) =>
      s.id === row.seller_id
        ? {
            ...s,
            deals: Math.max(0, s.deals - 1),
            material: Math.max(0, s.material - Number(row.material_value || 0)),
          }
        : s,
    );
    const previousRanked = rankSellers(before, weights);
    const previousRank =
      previousRanked.findIndex((s) => s.id === row.seller_id) + 1;
    if (previousRank === 0) return null;
    return { currentRank, previousRank };
  })();

  return (
    <section className="mb-8">
      <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-card to-primary/10 p-5">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="size-16 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-display font-black text-lg ring-2 ring-gold/60 shrink-0">
            {row.seller_avatar ? (
              <img src={row.seller_avatar} alt={row.seller_name} className="size-full object-cover" />
            ) : (
              initials(row.seller_name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gold font-mono font-bold">
              <Sparkles className="size-3" />
              Última matrícula
            </div>
            <div className="font-display font-black text-lg md:text-xl truncate">
              {row.seller_name}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <GraduationCap className="size-3.5" />
              <span className="truncate">
                {row.student_name} · {formatDateBR(row.enrollment_date)}
              </span>
            </div>
          </div>
          {movement && <MovementBadge {...movement} />}
        </div>
      </div>
    </section>
  );
}

function MovementBadge({
  currentRank,
  previousRank,
}: {
  currentRank: number;
  previousRank: number;
}) {
  const diff = previousRank - currentRank; // positivo = subiu
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  const color =
    diff > 0 ? "text-emerald-400" : diff < 0 ? "text-accent" : "text-muted-foreground";
  const label =
    diff > 0
      ? `Subiu ${diff} ${diff === 1 ? "posição" : "posições"}`
      : diff < 0
        ? `Caiu ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "posição" : "posições"}`
        : `Manteve o ${ordinal(currentRank)} lugar`;
  return (
    <div className="flex flex-col items-end shrink-0 text-right max-w-[150px]">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        Ranking
      </div>
      <div className={`flex items-center gap-1 font-display font-bold text-sm ${color}`}>
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
        Agora em {ordinal(currentRank)}
      </div>
    </div>
  );
}