import { useEffect, useState } from "react";
import { Seller, conversionRate } from "@/lib/ranking";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type WeekPatch = Pick<Seller, "weekScheduled" | "weekCompleted" | "weekEnrollments">;

export function MyWeeklyResultsDialog({
  seller,
  open,
  onOpenChange,
  onSave,
}: {
  seller: Seller | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (patch: WeekPatch) => void;
}) {
  const [scheduled, setScheduled] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [enrollments, setEnrollments] = useState(0);

  useEffect(() => {
    if (seller) {
      setScheduled(seller.weekScheduled);
      setCompleted(seller.weekCompleted);
      setEnrollments(seller.weekEnrollments);
    }
  }, [seller, open]);

  if (!seller) return null;

  const sanitize = (v: string) => {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    return Number.isFinite(n) ? n : 0;
  };

  const conv = conversionRate({ weekCompleted: completed, weekEnrollments: enrollments });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      weekScheduled: scheduled,
      weekCompleted: completed,
      weekEnrollments: enrollments,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Atualizar meus resultados da semana</DialogTitle>
          <DialogDescription>
            Olá, {seller.name}. Atualize apenas os seus números desta semana.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Entrevistas marcadas">
            <input
              type="number"
              min={0}
              step={1}
              value={scheduled}
              onChange={(e) => setScheduled(sanitize(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Entrevistas realizadas">
            <input
              type="number"
              min={0}
              step={1}
              value={completed}
              onChange={(e) => setCompleted(sanitize(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Matrículas fechadas">
            <input
              type="number"
              min={0}
              step={1}
              value={enrollments}
              onChange={(e) => setEnrollments(sanitize(e.target.value))}
              className="input"
            />
          </Field>

          <div className="rounded-lg bg-secondary/50 border border-border px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Taxa de conversão (automática)</span>
            <span className="font-mono font-bold text-primary">
              {conv.toFixed(1).replace(".", ",")}%
            </span>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              Salvar
            </button>
          </DialogFooter>
        </form>

        <style>{`
          .input {
            width: 100%;
            background-color: var(--input);
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            font-family: ui-monospace, monospace;
            outline: none;
          }
          .input:focus { border-color: var(--primary); }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
