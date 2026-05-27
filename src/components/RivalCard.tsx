import { ChevronUp, Crown, Swords } from "lucide-react";
import type { Seller } from "@/lib/ranking";

export function RivalCard({
  rank,
  ranked,
  sellerId,
}: {
  rank: number | null;
  ranked: Seller[];
  sellerId: string;
}) {
  if (!rank) return null;
  const me = ranked[rank - 1];
  if (!me) return null;

  // Líder: mostra quem está colando atrás
  if (rank === 1) {
    const chaser = ranked[1];
    if (!chaser) {
      return (
        <Banner
          icon={<Crown className="size-4 text-gold" />}
          label="Você lidera o ranking"
          body="Sem rival à vista. Construa vantagem."
          tone="gold"
        />
      );
    }
    const gap = me.deals - chaser.deals;
    return (
      <Banner
        icon={<Crown className="size-4 text-gold" />}
        label="Você lidera o ranking"
        body={
          gap === 0
            ? `${chaser.name} está empatado com você — não relaxe.`
            : `${chaser.name} está ${gap} ${gap === 1 ? "matrícula" : "matrículas"} atrás.`
        }
        avatar={chaser.avatar}
        rivalName={chaser.name}
        tone="gold"
      />
    );
  }

  // Tem alguém acima
  const rival = ranked[rank - 2];
  if (!rival) return null;
  const gap = rival.deals - me.deals;
  return (
    <Banner
      icon={<Swords className="size-4 text-primary" />}
      label={`Rival da semana · ${rival.name}`}
      body={
        gap === 0
          ? `Empatados em ${me.deals} matrículas — próxima decide.`
          : `Você está ${gap} ${gap === 1 ? "matrícula" : "matrículas"} atrás. Ultrapasse hoje.`
      }
      avatar={rival.avatar}
      rivalName={rival.name}
      tone="primary"
      extra={
        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <ChevronUp className="size-3" />
          {gap > 0 ? `+${gap} pra passar` : "passe agora"}
        </div>
      }
    />
  );
}

function Banner({
  icon,
  label,
  body,
  avatar,
  rivalName,
  tone,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
  avatar?: string | null;
  rivalName?: string;
  tone: "primary" | "gold";
  extra?: React.ReactNode;
}) {
  const ring =
    tone === "gold"
      ? "border-gold/40 from-gold/10 to-transparent"
      : "border-primary/40 from-primary/10 to-transparent";
  return (
    <section
      className={`rounded-2xl border bg-gradient-to-br ${ring} p-4 flex items-center gap-4`}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={rivalName ?? ""}
          className="size-12 rounded-full object-cover border border-border shrink-0"
        />
      ) : (
        <div className="size-12 rounded-full bg-secondary flex items-center justify-center font-display font-bold text-sm shrink-0">
          {(rivalName ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-sm font-semibold leading-snug">{body}</div>
      </div>
      {extra}
    </section>
  );
}