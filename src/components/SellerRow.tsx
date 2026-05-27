import { Seller, formatBRL } from "@/lib/ranking";
import { Trash2, TrendingUp, Pencil, Crown } from "lucide-react";
import { Link } from "@tanstack/react-router";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function SellerRow({
  seller,
  rank,
  onChange,
  onDelete,
  onEdit,
  readOnly = false,
  showEditButton = true,
  editLabel,
  showFinancial = false,
  monthlyFees = 0,
  estimatedCommission = 0,
}: {
  seller: Seller & { score: number };
  rank: number;
  onChange: (patch: Partial<Seller>) => void;
  onDelete: () => void;
  onEdit: () => void;
  readOnly?: boolean;
  showEditButton?: boolean;
  editLabel?: string;
  showFinancial?: boolean;
  monthlyFees?: number;
  estimatedCommission?: number;
}) {
  const isPodium = rank <= 3;
  const rankColor =
    rank === 1 ? "text-gold" : rank === 2 ? "text-silver" : rank === 3 ? "text-bronze" : "text-muted-foreground";

  return (
    <div
      className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl bg-card border transition-colors overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
        isPodium ? "border-primary/30 hover:border-primary/60" : "border-border hover:border-primary/40"
      }`}
    >
      {rank === 1 && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-gold to-accent" />
      )}
      <div className={`font-display font-black text-lg w-8 text-center shrink-0 ${rankColor} flex items-center justify-center gap-1`}>
        {rank === 1 && <Crown className="size-3.5 fill-current" />}
        {rank}
      </div>

      <div className="flex items-center gap-2.5 min-w-0 w-[180px] shrink-0">
        <div className="size-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-display font-bold text-sm shrink-0">
          {seller.avatar ? (
            <img src={seller.avatar} alt={seller.name} className="size-full object-cover" />
          ) : (
            initials(seller.name)
          )}
        </div>
        {readOnly ? (
          <Link
            to="/vendedor/$sellerId"
            params={{ sellerId: seller.id }}
            preload="intent"
            className="font-semibold truncate min-w-0 text-sm hover:text-primary transition-colors"
          >
            {seller.name}
          </Link>
        ) : (
          <Link
            to="/vendedor/$sellerId"
            params={{ sellerId: seller.id }}
            preload="intent"
            className="font-semibold truncate min-w-0 text-sm hover:text-primary transition-colors"
            title="Ver dashboard"
          >
            {seller.name}
          </Link>
        )}
      </div>

      <Metric label="Ent. marcadas (mês)" value={seller.monthScheduled ?? 0} />
      <Metric label="Ent. realizadas (mês)" value={seller.monthCompleted ?? 0} />
      <Metric label="Matrículas" value={seller.deals} accent="primary" />
      <Metric label="Material" value={formatBRL(seller.material)} mono />
      {showFinancial && (
        <>
          <Metric label="Mensalidade" value={formatBRL(monthlyFees)} mono />
          <Metric label="Comissão est." value={formatBRL(estimatedCommission)} mono accent="gold" />
        </>
      )}

      <div className="flex flex-col items-end min-w-[64px] ml-auto shrink-0">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Score</div>
        <div className={`flex items-center gap-1 font-mono font-black text-base ${isPodium ? "text-gold" : "text-primary"}`}>
          <TrendingUp className="size-3" />
          {seller.score}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {showEditButton && (
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-primary transition p-1"
            aria-label={editLabel ?? "Editar"}
            title={editLabel ?? "Editar"}
          >
            <Pencil className="size-4" />
          </button>
        )}
        {!readOnly && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-1"
            aria-label="Remover"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: number | string;
  mono?: boolean;
  accent?: "primary" | "gold" | "red";
}) {
  const color =
    accent === "gold" ? "text-gold" : accent === "primary" ? "text-primary" : accent === "red" ? "text-accent" : "text-foreground";
  return (
    <div className="flex flex-col min-w-[88px] shrink-0">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={`font-display font-bold text-sm tabular-nums ${mono ? "font-mono" : ""} ${color} truncate`}>
        {value}
      </div>
    </div>
  );
}
