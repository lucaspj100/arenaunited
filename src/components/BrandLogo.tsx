import type { CSSProperties } from "react";
import { useBrandConfig, type BrandLogoConfig, type BrandLogoShape } from "@/hooks/useBrandLogo";

type Props = {
  variant?: "compact" | "full";
  /** Override do tamanho do container; senão usa o do config (compact) ou 1.5x (full). */
  size?: number;
  className?: string;
  /** Permite forçar shape (ex.: tela de login sempre redonda) */
  shape?: BrandLogoShape;
  /** Para previews controlados */
  configOverride?: BrandLogoConfig;
  urlOverride?: string;
};

export function BrandLogo({
  variant = "compact",
  size,
  className,
  shape,
  configOverride,
  urlOverride,
}: Props) {
  const { compactUrl, fullUrl, config: loaded } = useBrandConfig();
  const config = configOverride ?? loaded;
  const url =
    urlOverride ?? (variant === "full" ? fullUrl : compactUrl);
  const resolvedShape: BrandLogoShape = shape ?? config.shape;
  const baseSize =
    size ?? (variant === "full" ? Math.round(config.containerSize * 1.5) : config.containerSize);

  const radius =
    resolvedShape === "round" ? "9999px" : resolvedShape === "none" ? "0" : "16px";

  const containerStyle: CSSProperties =
    resolvedShape === "none"
      ? { width: baseSize, height: baseSize }
      : {
          width: baseSize,
          height: baseSize,
          borderRadius: radius,
          background: "linear-gradient(135deg, rgba(8,14,32,0.95), rgba(0,0,0,0.55))",
          border: "1px solid rgba(0, 102, 255, 0.35)",
          boxShadow:
            "0 0 18px rgba(0,102,255,0.20), inset 0 0 0 1px rgba(255,255,255,0.04)",
        };

  const imgStyle: CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    objectPosition: "center",
    transform: `translate(${config.offsetX}%, ${config.offsetY}%) scale(${config.zoom})`,
    transformOrigin: "center",
    imageRendering: "auto",
  };

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`}
      style={containerStyle}
    >
      <img
        src={url}
        alt="Logo"
        draggable={false}
        decoding="async"
        className="select-none"
        style={imgStyle}
      />
    </div>
  );
}