import { Seller, formatBRL } from "@/lib/ranking";
import { Trash2, TrendingUp, Pencil } from "lucide-react";

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
}: {
  seller: Seller & { score: number };
  rank: number;
  onChange: (patch: Partial<Seller>) => void;
  onDelete: () => void;
  onEdit: () => void;
  readOnly?: boolean;
  showEditButton?: boolean;
  editLabel?: string;
}) {
  const pct = (v: number, g: number) => Math.min((v / (g || 1)) * 100, 100);

  return (
    <div className="group grid grid-cols-[40px_minmax(140px,1.5fr)_1fr_1fr_70px_56px] gap-3 items-center px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors">
      <div className="font-display font-bold text-lg text-muted-foreground">{rank}º</div>

      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-display font-bold text-sm shrink-0">
          {seller.avatar ? (
            <img src={seller.avatar} alt={seller.name} className="size-full object-cover" />
          ) : (
            initials(seller.name)
          )}
        </div>
        {readOnly ? (
          <span className="font-medium truncate min-w-0">{seller.name}</span>
        ) : (
          <input
            value={seller.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="bg-transparent font-medium truncate outline-none focus:bg-input rounded px-1 -mx-1 min-w-0 w-full"
          />
        )}
      </div>

      <NumCell value={seller.deals} onChange={(v) => onChange({ deals: v })} pct={pct(seller.deals, seller.goalDeals)} readOnly={readOnly} />
      <NumCell value={seller.material} onChange={(v) => onChange({ material: v })} format={formatBRL} pct={pct(seller.material, seller.goalMaterial)} readOnly={readOnly} />

      <div className="flex items-center justify-end gap-1 font-mono font-bold text-primary">
        <TrendingUp className="size-3" />
        {seller.score}
      </div>

      <div className="flex items-center gap-1 justify-self-end">
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

function NumCell({
  value,
  onChange,
  format,
  pct,
  readOnly,
}: {
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  pct: number;
  readOnly?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      {readOnly ? (
        <div className="font-mono text-sm tabular-nums px-1 py-0.5">{value}</div>
      ) : (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent font-mono text-sm tabular-nums outline-none focus:bg-input rounded px-1 py-0.5"
        />
      )}
      <div className="text-[10px] text-muted-foreground font-mono truncate">
        {format ? format(value) : value}
      </div>
      <div className="absolute -bottom-1 left-0 right-1 h-0.5 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
