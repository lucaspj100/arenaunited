import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  COMMISSION_RATE,
  ROLE_LABELS,
  SellerRole,
  formatBRL,
} from "@/lib/commissions";
import { Enrollment, EnrollmentInput } from "@/lib/enrollments";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type SellerOption = { id: string; name: string; role: SellerRole };

export function EnrollmentFormDialog({
  open,
  onOpenChange,
  initial,
  defaultSellerId,
  sellers,
  canEditAll,
  currentRole,
  currentSellerName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Enrollment | null;
  defaultSellerId?: string | null;
  sellers?: SellerOption[];
  canEditAll: boolean;
  currentRole?: SellerRole | null;
  currentSellerName?: string | null;
  onSave: (input: EnrollmentInput) => Promise<void> | void;
}) {
  const editing = !!initial;
  const [sellerId, setSellerId] = useState(initial?.sellerId ?? defaultSellerId ?? "");
  const [studentName, setStudentName] = useState(initial?.studentName ?? "");
  const [date, setDate] = useState(initial?.enrollmentDate ?? todayISO());
  const [enrollmentValue, setEnrollmentValue] = useState<string>(
    initial ? String(initial.enrollmentValue) : "",
  );
  const [monthlyFee, setMonthlyFee] = useState<string>(
    initial ? String(initial.monthlyFee) : "",
  );
  const [materialValue, setMaterialValue] = useState<string>(
    initial ? String(initial.materialValue) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSellerId(initial?.sellerId ?? defaultSellerId ?? "");
    setStudentName(initial?.studentName ?? "");
    setDate(initial?.enrollmentDate ?? todayISO());
    setEnrollmentValue(initial ? String(initial.enrollmentValue) : "");
    setMonthlyFee(initial ? String(initial.monthlyFee) : "");
    setMaterialValue(initial ? String(initial.materialValue) : "");
    setNotes(initial?.notes ?? "");
  }, [open, initial, defaultSellerId]);

  const selected = sellers?.find((s) => s.id === sellerId);
  const effectiveRole: SellerRole | null =
    initial?.roleSnapshot ?? selected?.role ?? currentRole ?? null;
  const effectiveName =
    selected?.name ?? currentSellerName ?? (editing ? "—" : "Você");

  const enrollNum = Number(enrollmentValue) || 0;
  const previewCommission = effectiveRole
    ? Math.round(enrollNum * COMMISSION_RATE[effectiveRole] * 100) / 100
    : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) return alert("Selecione um vendedor.");
    if (!studentName.trim()) return alert("Informe o nome do aluno.");
    if (!date) return alert("Informe a data.");
    if (enrollNum < 0 || Number(monthlyFee) < 0 || Number(materialValue) < 0)
      return alert("Valores não podem ser negativos.");
    setSaving(true);
    try {
      await onSave({
        sellerId,
        studentName: studentName.trim(),
        enrollmentDate: date,
        enrollmentValue: enrollNum,
        monthlyFee: Number(monthlyFee) || 0,
        materialValue: Number(materialValue) || 0,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + ((err as Error)?.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Editar matrícula" : "Nova matrícula fechada"}
          </DialogTitle>
          <DialogDescription>
            Comissão e premiação são calculadas automaticamente pelo cargo do vendedor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {canEditAll && sellers ? (
            <Field label="Vendedor">
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="input"
              >
                <option value="">— selecione —</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({ROLE_LABELS[s.role]})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="rounded-lg bg-secondary/40 border border-border px-3 py-2 text-xs">
              <span className="text-muted-foreground">Vendedor: </span>
              <span className="font-semibold">{effectiveName}</span>
              {effectiveRole && (
                <span className="ml-2 text-muted-foreground">
                  · Cargo: <strong>{ROLE_LABELS[effectiveRole]}</strong>
                </span>
              )}
            </div>
          )}

          <Field label="Nome do aluno">
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="input"
              maxLength={120}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data da matrícula">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Valor da matrícula (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={enrollmentValue}
                onChange={(e) => setEnrollmentValue(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor da mensalidade (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Valor do material (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={materialValue}
                onChange={(e) => setMaterialValue(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Observações (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[60px]"
              maxLength={500}
            />
          </Field>

          {effectiveRole && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">
                Comissão prevista ({Math.round(COMMISSION_RATE[effectiveRole] * 100)}% sobre matrícula)
              </span>
              <span className="font-display font-bold text-primary">
                {formatBRL(previewCommission)}
              </span>
            </div>
          )}

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
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar"}
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
            outline: none;
            color: var(--foreground);
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
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
