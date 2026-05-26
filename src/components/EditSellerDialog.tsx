import { useEffect, useRef, useState } from "react";
import { Seller, formatBRL } from "@/lib/ranking";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, X } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export function EditSellerDialog({
  seller,
  open,
  onOpenChange,
  onSave,
  canAssignDirector = false,
}: {
  seller: Seller | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (patch: Partial<Seller>) => void;
  canAssignDirector?: boolean;
}) {
  const [form, setForm] = useState<Seller | null>(seller);
  const fileRef = useRef<HTMLInputElement>(null);
  const [directors, setDirectors] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    setForm(seller);
  }, [seller, open]);

  useEffect(() => {
    if (!open || !canAssignDirector) return;
    supabase
      .from("allowed_emails")
      .select("name,email,used_by,app_role")
      .eq("app_role", "diretor")
      .not("used_by", "is", null)
      .then(({ data, error }) => {
        if (error) {
          console.warn("directors load", error);
          return;
        }
        setDirectors(
          (data ?? []).map((r) => ({
            id: r.used_by as string,
            name: r.name as string,
            email: r.email as string,
          })),
        );
      });
  }, [open, canAssignDirector]);

  if (!form) return null;

  const set = <K extends keyof Seller>(k: K, v: Seller[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Imagem muito grande (máx 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("avatar", String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar vendedor</DialogTitle>
          <DialogDescription>
            Os dados são salvos no banco e sincronizam para toda a equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative size-16 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center font-display font-bold text-lg shrink-0">
              {form.avatar ? (
                <img src={form.avatar} alt={form.name} className="size-full object-cover" />
              ) : (
                initials(form.name)
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-sm font-medium"
              >
                <Upload className="size-3.5" /> Enviar foto
              </button>
              {form.avatar && (
                <button
                  type="button"
                  onClick={() => set("avatar", undefined)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" /> Remover
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <Field label="Nome">
            <input
              value={form.name}
              maxLength={60}
              onChange={(e) => set("name", e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Número de vendas">
              <input
                type="number"
                min={0}
                value={form.deals}
                onChange={(e) => set("deals", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Material vendido (R$)">
              <input
                type="number"
                min={0}
                value={form.material}
                onChange={(e) => set("material", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
          </div>

          <div className="rounded-lg bg-secondary/50 border border-border px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Material vendido</span>
            <span className="font-mono font-bold text-primary">{formatBRL(form.material)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta de vendas (nº)">
              <input
                type="number"
                min={0}
                value={form.goalDeals}
                onChange={(e) => set("goalDeals", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Meta de material (R$)">
              <input
                type="number"
                min={0}
                value={form.goalMaterial}
                onChange={(e) => set("goalMaterial", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            As metas são individuais por vendedor.
          </p>

          <div className="pt-2 border-t border-border">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Competições da semana
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Agendadas">
                <input
                  type="number"
                  min={0}
                  value={form.weekScheduled}
                  onChange={(e) => set("weekScheduled", Number(e.target.value) || 0)}
                  className="input"
                />
              </Field>
              <Field label="Realizadas">
                <input
                  type="number"
                  min={0}
                  value={form.weekCompleted}
                  onChange={(e) => set("weekCompleted", Number(e.target.value) || 0)}
                  className="input"
                />
              </Field>
              <Field label="Matrículas">
                <input
                  type="number"
                  min={0}
                  value={form.weekEnrollments}
                  onChange={(e) => set("weekEnrollments", Number(e.target.value) || 0)}
                  className="input"
                />
              </Field>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Comissão e cargo
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cargo do vendedor">
                <select
                  value={form.role}
                  onChange={(e) => set("role", e.target.value as Seller["role"])}
                  className="input"
                >
                  <option value="consultor">Consultor (padrão 30%)</option>
                  <option value="gerente">Gerente (padrão 53%)</option>
                </select>
              </Field>
              <Field label="Comissão personalizada (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={
                    form.commissionRate == null
                      ? ""
                      : Math.round(form.commissionRate * 10000) / 100
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      set("commissionRate", null);
                    } else {
                      const pct = Math.max(0, Math.min(100, Number(raw)));
                      set("commissionRate", pct / 100);
                    }
                  }}
                  placeholder="Padrão do cargo"
                  className="input"
                />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Deixe a comissão personalizada vazia para usar o padrão do cargo.
            </p>
          </div>

          {canAssignDirector && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Diretor responsável
              </div>
              <Field label="Diretor que acompanha este vendedor">
                <select
                  value={form.directorId ?? ""}
                  onChange={(e) => set("directorId", (e.target.value || null) as Seller["directorId"])}
                  className="input"
                >
                  <option value="">— Sem diretor —</option>
                  {directors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-[11px] text-muted-foreground mt-1">
                O diretor selecionado verá e editará as comissões deste vendedor.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.inMyTeam}
                onChange={(e) => set("inMyTeam", e.target.checked)}
                className="size-4 accent-primary"
              />
              <div>
                <div className="text-sm font-semibold">Faz parte dos Fanáticos</div>
                <div className="text-[11px] text-muted-foreground">
                  Marque para incluir este vendedor no ranking exclusivo "Fanáticos".
                </div>
              </div>
            </label>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Vincular a usuário
            </div>
            <Field label="user_id do usuário (UUID)">
              <input
                value={form.userId ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  set("userId", (v || null) as Seller["userId"]);
                }}
                placeholder="Cole aqui o UUID do usuário criado em Cloud → Users"
                className="input"
              />
            </Field>
            <p className="text-[11px] text-muted-foreground mt-1">
              Quando vinculado, este vendedor poderá entrar e editar apenas os próprios resultados da semana.
            </p>
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
