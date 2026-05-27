import { useMemo } from "react";
import { Seller } from "@/lib/ranking";
import { classifyPerformance, pickQuote, TIER_LABEL } from "@/lib/motivation";
import { Quote, Sparkles, Compass, HeartHandshake } from "lucide-react";

export function MotivationCard({
  sellerId,
  rankedSellers,
}: {
  sellerId: string;
  rankedSellers: Seller[];
}) {
  const data = useMemo(() => {
    const idx = rankedSellers.findIndex((s) => s.id === sellerId);
    if (idx === -1) return null;
    const me = rankedSellers[idx];
    const tier = classifyPerformance({
      rank: idx + 1,
      total: rankedSellers.length,
      deals: me.deals,
      goalDeals: me.goalDeals,
    });
    const quote = pickQuote(sellerId, tier);
    return { tier, quote };
  }, [rankedSellers, sellerId]);

  if (!data) return null;

  const { tier, quote } = data;

  const tone =
    tier === "top"
      ? "from-gold/15 via-gold/5 to-transparent border-gold/40"
      : tier === "struggling"
        ? "from-primary/10 via-primary/5 to-transparent border-primary/30"
        : tier === "rising"
          ? "from-primary/15 via-primary/5 to-transparent border-primary/40"
          : "from-secondary/40 via-secondary/10 to-transparent border-border";

  const Icon =
    tier === "top" ? Sparkles : tier === "struggling" ? HeartHandshake : tier === "rising" ? Compass : Quote;

  const iconColor =
    tier === "top"
      ? "text-gold"
      : tier === "struggling"
        ? "text-primary"
        : tier === "rising"
          ? "text-primary"
          : "text-muted-foreground";

  return (
    <section
      className={`mb-8 rounded-2xl border bg-gradient-to-br ${tone} p-5 md:p-6 flex items-start gap-4`}
    >
      <div className={`shrink-0 size-10 rounded-xl bg-background/40 flex items-center justify-center ${iconColor}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className={`text-[10px] uppercase tracking-[0.2em] font-mono mb-1.5 ${iconColor}`}>
          {TIER_LABEL[tier]}
        </div>
        <p className="font-display text-base md:text-lg leading-snug">
          “{quote.text}”
        </p>
        <div className="text-xs text-muted-foreground mt-2">— {quote.author}</div>
      </div>
    </section>
  );
}