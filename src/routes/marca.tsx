import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImageUp, Loader2, Save, RotateCcw } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useBrandConfig,
  uploadBrandLogo,
  saveBrandLogoConfig,
  DEFAULT_LOGO_CONFIG,
  type BrandLogoConfig,
  type BrandLogoShape,
} from "@/hooks/useBrandLogo";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/marca")({
  component: BrandSettingsPage,
  head: () => ({ meta: [{ title: "Identidade visual — United Performance" }] }),
});

function BrandSettingsPage() {
  const { loading: ul, role } = useCurrentUser();
  const isAdmin = role === "admin";
  const navigate = useNavigate();
  const { compactUrl, fullUrl, config, refresh, loading } = useBrandConfig();

  const [draft, setDraft] = useState<BrandLogoConfig>(config);
  const [uploading, setUploading] = useState<null | "compact" | "full">(null);
  const [saving, setSaving] = useState(false);
  const compactRef = useRef<HTMLInputElement>(null);
  const fullRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ul && !isAdmin) navigate({ to: "/" });
  }, [ul, isAdmin, navigate]);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const dirty =
    draft.zoom !== config.zoom ||
    draft.offsetX !== config.offsetX ||
    draft.offsetY !== config.offsetY ||
    draft.containerSize !== config.containerSize ||
    draft.shape !== config.shape;

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    variant: "compact" | "full",
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(variant);
    try {
      await uploadBrandLogo(file, variant);
      await refresh();
    } catch (err) {
      alert("Erro ao enviar logo: " + ((err as Error)?.message ?? "erro"));
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveBrandLogoConfig(draft);
      await refresh();
    } catch (err) {
      alert("Erro ao salvar: " + ((err as Error)?.message ?? "erro"));
    } finally {
      setSaving(false);
    }
  };

  if (ul || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-8">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <h1 className="font-display font-black text-xl">Identidade visual</h1>
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          {/* Uploads */}
          <div className="grid sm:grid-cols-2 gap-4">
            <UploadCard
              title="Logo compacta"
              hint="Usada no cabeçalho do dashboard"
              url={compactUrl}
              busy={uploading === "compact"}
              onPick={() => compactRef.current?.click()}
            />
            <UploadCard
              title="Logo completa"
              hint="Usada na tela de login"
              url={fullUrl}
              busy={uploading === "full"}
              onPick={() => fullRef.current?.click()}
            />
            <input
              ref={compactRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => handleUpload(e, "compact")}
            />
            <input
              ref={fullRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => handleUpload(e, "full")}
            />
          </div>

          {/* Controles */}
          <div className="rounded-2xl bg-card border border-border p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-sm">Enquadramento</h2>
              <button
                type="button"
                onClick={() => setDraft(DEFAULT_LOGO_CONFIG)}
                className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3" /> Resetar
              </button>
            </div>

            <SliderRow
              label="Zoom"
              value={draft.zoom}
              min={0.3}
              max={3}
              step={0.05}
              format={(v) => `${v.toFixed(2)}x`}
              onChange={(v) => setDraft((d) => ({ ...d, zoom: v }))}
            />
            <SliderRow
              label="Posição horizontal"
              value={draft.offsetX}
              min={-50}
              max={50}
              step={1}
              format={(v) => `${v}%`}
              onChange={(v) => setDraft((d) => ({ ...d, offsetX: v }))}
            />
            <SliderRow
              label="Posição vertical"
              value={draft.offsetY}
              min={-50}
              max={50}
              step={1}
              format={(v) => `${v}%`}
              onChange={(v) => setDraft((d) => ({ ...d, offsetY: v }))}
            />
            <SliderRow
              label="Tamanho do container"
              value={draft.containerSize}
              min={48}
              max={120}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => setDraft((d) => ({ ...d, containerSize: v }))}
            />

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Formato do container</div>
              <div className="grid grid-cols-3 gap-2">
                {(["square", "round", "none"] as BrandLogoShape[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, shape: s }))}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      draft.shape === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-input border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "square" ? "Quadrado" : s === "round" ? "Redondo" : "Sem container"}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar enquadramento
            </button>
          </div>
        </section>

        {/* Pré-visualização */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start">
          <PreviewCard label="Cabeçalho do dashboard">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[hsl(var(--background))]">
              <BrandLogo variant="compact" configOverride={draft} urlOverride={compactUrl} />
              <div>
                <div className="font-display font-black text-lg leading-none">
                  United <span className="text-primary">Performance</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                  Arena comercial
                </div>
              </div>
            </div>
          </PreviewCard>

          <PreviewCard label="Tela de login">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[hsl(var(--background))]">
              <BrandLogo
                variant="full"
                configOverride={draft}
                urlOverride={fullUrl}
                size={Math.round(draft.containerSize * 1.5)}
              />
              <div className="font-display font-black text-xl">
                United <span className="text-primary">Performance</span>
              </div>
            </div>
          </PreviewCard>
        </aside>
      </div>
    </main>
  );
}

function UploadCard({
  title,
  hint,
  url,
  busy,
  onPick,
}: {
  title: string;
  hint: string;
  url: string;
  busy: boolean;
  onPick: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div>
        <div className="font-display font-bold text-sm">{title}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <div className="aspect-square w-full rounded-xl bg-[hsl(var(--background))] border border-border flex items-center justify-center overflow-hidden">
        <img src={url} alt={title} className="max-w-[80%] max-h-[80%] object-contain" />
      </div>
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
        Enviar nova
      </button>
    </div>
  );
}

function PreviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-2">{label}</div>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}