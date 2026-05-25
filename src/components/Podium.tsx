import { Seller } from "@/lib/ranking";
import { Trophy, Medal, Award } from "lucide-react";

type RankedSeller = Seller & { score: number };

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const tiers = [
  { rank: 2, height: "h-32 md:h-40", color: "text-silver", bg: "from-silver/20 to-transparent", icon: Medal, label: "PRATA" },
  { rank: 1, height: "h-44 md:h-56", color: "text-gold", bg: "from-gold/30 to-transparent", icon: Trophy, label: "OURO" },
  { rank: 3, height: "h-24 md:h-32", color: "text-bronze", bg: "from-bronze/20 to-transparent", icon: Award, label: "BRONZE" },
];

export function Podium({ top3 }: { top3: RankedSeller[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 items-end">
      {tiers.map((tier) => {
        const seller = top3[tier.rank - 1];
        const Icon = tier.icon;
        if (!seller) return <div key={tier.rank} />;
        return (
          <div key={tier.rank} className="flex flex-col items-center">
            <div className="mb-3 flex flex-col items-center">
              <div
                className={`relative size-16 md:size-20 rounded-full bg-card border-2 overflow-hidden ${tier.rank === 1 ? "border-gold shadow-[var(--shadow-glow)]" : "border-border"} flex items-center justify-center text-lg md:text-xl font-display font-bold`}
              >
                {seller.avatar ? (
                  <img src={seller.avatar} alt={seller.name} className="size-full object-cover" />
                ) : (
                  initials(seller.name)
                )}
                <Icon className={`absolute -top-3 -right-3 size-7 ${tier.color}`} fill="currentColor" />
              </div>
              <div className="mt-2 text-center">
                <div className="font-semibold text-sm md:text-base truncate max-w-[120px]">{seller.name}</div>
                <div className={`text-xs font-mono ${tier.color}`}>{seller.score}%</div>
              </div>
            </div>
            <div
              className={`w-full ${tier.height} rounded-t-2xl bg-gradient-to-b ${tier.bg} border-t-2 border-x-2 ${tier.rank === 1 ? "border-gold/50" : "border-border"} flex items-start justify-center pt-3`}
            >
              <span className={`font-display font-black text-2xl md:text-4xl ${tier.color}`}>
                {tier.rank}º
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
