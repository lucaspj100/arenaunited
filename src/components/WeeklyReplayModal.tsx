import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trophy, Calendar, TrendingUp, Quote } from "lucide-react";
import type { RecapSlide } from "@/lib/weeklyRecap";

const AUTO_ADVANCE_MS = 4500;

export function WeeklyReplayModal({
  open,
  slides,
  onClose,
}: {
  open: boolean;
  slides: RecapSlide[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) setIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setIdx((i) => (i + 1 < slides.length ? i + 1 : i));
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [open, idx, slides.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(slides.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, slides.length, onClose]);

  if (!open || slides.length === 0) return null;
  const slide = slides[idx];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-fade-in">
      {/* progress bars */}
      <div className="flex gap-1 p-4">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full bg-primary transition-all ${
                i < idx ? "w-full" : i === idx ? "animate-[storyfill_4.5s_linear_forwards]" : "w-0"
              }`}
              style={i === idx ? { animation: `storyfill ${AUTO_ADVANCE_MS}ms linear forwards` } : undefined}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 size-10 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center"
        aria-label="Fechar"
      >
        <X className="size-4" />
      </button>

      <div
        className="flex-1 flex items-center justify-center px-8"
        onClick={(e) => {
          const x = e.clientX;
          const w = window.innerWidth;
          if (x < w / 3) setIdx((i) => Math.max(0, i - 1));
          else setIdx((i) => Math.min(slides.length - 1, i + 1));
        }}
      >
        <SlideRenderer slide={slide} onClose={onClose} isLast={idx === slides.length - 1} />
      </div>

      <div className="flex items-center justify-between px-6 pb-6 text-muted-foreground">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="size-10 rounded-full bg-secondary/60 disabled:opacity-30 flex items-center justify-center"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-xs font-mono">
          {idx + 1} / {slides.length}
        </div>
        <button
          onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
          disabled={idx === slides.length - 1}
          className="size-10 rounded-full bg-secondary/60 disabled:opacity-30 flex items-center justify-center"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <style>{`@keyframes storyfill { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}

function SlideRenderer({
  slide,
  onClose,
  isLast,
}: {
  slide: RecapSlide;
  onClose: () => void;
  isLast: boolean;
}) {
  if (slide.kind === "cover") {
    return (
      <div className="text-center max-w-md animate-scale-in">
        {slide.avatar && (
          <img
            src={slide.avatar}
            alt={slide.name}
            className="size-28 rounded-full object-cover mx-auto mb-6 border-2 border-gold shadow-glow"
          />
        )}
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3">
          Sua semana
        </div>
        <h2 className="font-display font-black text-4xl md:text-5xl leading-tight mb-3">
          {slide.name}
        </h2>
        <div className="text-sm text-muted-foreground font-mono">{slide.weekLabel}</div>
      </div>
    );
  }
  if (slide.kind === "stat") {
    return (
      <div className="text-center animate-scale-in">
        <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-4">
          <TrendingUp className="size-3.5" />
          {slide.eyebrow}
        </div>
        <div className="font-display font-black text-7xl md:text-8xl tabular-nums mb-4 bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
          {slide.value}
        </div>
        {slide.delta && (
          <div className={`text-base font-mono ${slide.positive ? "text-success" : "text-muted-foreground"}`}>
            {slide.delta}
          </div>
        )}
      </div>
    );
  }
  if (slide.kind === "bestDay") {
    return (
      <div className="text-center animate-scale-in">
        <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-4">
          <Calendar className="size-3.5" />
          Seu melhor dia
        </div>
        <div className="font-display font-black text-6xl md:text-7xl mb-4">{slide.weekday}</div>
        <div className="text-lg text-muted-foreground">
          {slide.count} {slide.count === 1 ? "matrícula" : "matrículas"} num único dia
        </div>
      </div>
    );
  }
  if (slide.kind === "rank") {
    return (
      <div className="text-center animate-scale-in">
        <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-4">
          <Trophy className="size-3.5 text-gold" />
          Sua posição
        </div>
        <div className="font-display font-black text-8xl md:text-9xl text-gold mb-2 tabular-nums">
          {slide.rank}º
        </div>
        <div className="text-base text-muted-foreground">de {slide.total} vendedores</div>
      </div>
    );
  }
  // quote
  return (
    <div className="text-center max-w-2xl animate-scale-in">
      <Quote className="size-6 text-primary mx-auto mb-6" />
      <p className="font-display text-2xl md:text-3xl leading-snug mb-6">
        “{slide.text}”
      </p>
      <div className="text-sm text-muted-foreground mb-8">— {slide.author}</div>
      {isLast && (
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold hover:opacity-90"
        >
          Bora pra próxima semana
        </button>
      )}
    </div>
  );
}