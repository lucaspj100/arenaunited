import { Weights } from "@/lib/ranking";
import { Briefcase, Package } from "lucide-react";

const items: { key: keyof Weights; label: string; icon: typeof Briefcase }[] = [
  { key: "deals", label: "Número de vendas", icon: Briefcase },
  { key: "material", label: "Valor de material vendido", icon: Package },
];

export function WeightsPanel({
  weights,
  onWeights,
  readOnly = false,
}: {
  weights: Weights;
  onWeights: (w: Weights) => void;
  readOnly?: boolean;
}) {
  const total = items.reduce((a, i) => a + weights[i.key], 0);

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display font-bold text-lg">Pesos dos critérios</h3>
        <span className="text-xs font-mono text-muted-foreground">total {total}</span>
      </div>
      <div className="space-y-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="size-4 text-primary" />
                </div>
                <span className="font-medium text-sm flex-1">{it.label}</span>
                <span className="font-mono text-xs text-primary">{weights[it.key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[it.key]}
                disabled={readOnly}
                onChange={(e) => onWeights({ ...weights, [it.key]: Number(e.target.value) })}
                className="w-full accent-primary disabled:opacity-50"
              />
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        As metas individuais de cada vendedor são editadas no botão de editar.
      </p>
    </div>
  );
}
