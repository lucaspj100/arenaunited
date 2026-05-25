import { MaterialProgress, formatBRL } from "@/lib/commissions";

export function MaterialProgressBar({ progress }: { progress: MaterialProgress }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-bold">Premiação de material</div>
        <div className="font-mono text-xs text-muted-foreground">
          até {formatBRL(progress.nextMin)}
        </div>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-gold transition-all"
          style={{ width: `${progress.progressPct}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-foreground/90 leading-snug">{progress.message}</p>
    </div>
  );
}
