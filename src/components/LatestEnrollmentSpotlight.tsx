import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/ranking";
import { Sparkles, GraduationCap } from "lucide-react";

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

export function LatestEnrollmentSpotlight() {
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

  const total = Number(row.enrollment_value) + Number(row.material_value);

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
          <div className="flex flex-col items-end shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Total
            </div>
            <div className="font-mono font-black text-xl text-gold">
              {formatBRL(total)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}