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
  Interview,
  InterviewInput,
  InterviewStatus,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  todayISO,
} from "@/lib/interviews";

export type SellerOption = { id: string; name: string };

export function InterviewFormDialog({
  open,
  onOpenChange,
  initial,
  defaultSellerId,
  sellers,
  canEditAll,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Interview | null;
  defaultSellerId?: string | null;
  sellers?: SellerOption[]; // só admin precisa
  canEditAll: boolean;
  onSave: (input: InterviewInput) => Promise<void> | void;
}) {
  const editing = !!initial;
  const [sellerId, setSellerId] = useState<string>(
    initial?.sellerId ?? defaultSellerId ?? "",
  );
  const [leadName, setLeadName] = useState(initial?.leadName ?? "");
  const [leadPhone, setLeadPhone] = useState(initial?.leadPhone ?? "");
  const [date, setDate] = useState(initial?.scheduledDate ?? todayISO());
  const [time, setTime] = useState(initial?.scheduledTime ?? "09:00");
  const [status, setStatus] = useState<InterviewStatus>(initial?.status ?? "marcada");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSellerId(initial?.sellerId ?? defaultSellerId ?? "");
    setLeadName(initial?.leadName ?? "");
    setLeadPhone(initial?.leadPhone ?? "");
    setDate(initial?.scheduledDate ?? todayISO());
    setTime(initial?.scheduledTime ?? "09:00");
    setStatus(initial?.status ?? "marcada");
    setNotes(initial?.notes ?? "");
  }, [open, initial, defaultSellerId]);

  // Vendedor editando entrevista existente: só status/notes
  const lockMeta = editing && !canEditAll;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) {
      alert("Selecione um vendedor.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        sellerId,
        leadName: editing ? (leadName.trim() || "Entrevista") : "Entrevista",
        leadPhone: editing ? (leadPhone.trim() || null) : null,
        scheduledDate: date,
        scheduledTime: time.length === 5 ? `${time}:00` : time,
        status,
        notes: editing ? (notes.trim() || null) : null,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar a entrevista. " + ((err as Error)?.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Editar entrevista" : "Nova entrevista"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados da entrevista."
              : "Escolha a data e o horário."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {canEditAll && sellers && (
            <Field label="Vendedor">
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="input"
              >
                <option value="">— selecione —</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                disabled={lockMeta}
              />
            </Field>
            <Field label="Horário">
              <input
                type="time"
                value={time.slice(0, 5)}
                onChange={(e) => setTime(e.target.value)}
                className="input"
                disabled={lockMeta}
              />
            </Field>
          </div>

          {editing && (
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InterviewStatus)}
                className="input"
              >
                {INTERVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {INTERVIEW_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
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
          .input:disabled { opacity: 0.55; cursor: not-allowed; }
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
