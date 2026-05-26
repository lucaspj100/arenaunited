import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/united-logo.jpg";

const KEY = "brand.logo_url";
const FULL_KEY = "brand.logo_full_url";
const CONFIG_KEY = "brand.logo_config";

export function useBrandLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogo);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (data?.value) setLogoUrl(data.value);
    else setLogoUrl(defaultLogo);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logoUrl, loading, refresh };
}

export type BrandLogoVariant = "compact" | "full";

export async function uploadBrandLogo(
  file: File,
  variant: BrandLogoVariant = "compact",
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `logo-${variant}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("branding")
    .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
  const url = pub.publicUrl;
  const settingKey = variant === "full" ? FULL_KEY : KEY;
  const { error: setErr } = await supabase
    .from("app_settings")
    .upsert({ key: settingKey, value: url, updated_at: new Date().toISOString() });
  if (setErr) throw setErr;
  return url;
}

export type BrandLogoShape = "square" | "round" | "none";

export type BrandLogoConfig = {
  zoom: number; // 0.5 - 2
  offsetX: number; // -50 a 50 (% do container)
  offsetY: number; // -50 a 50 (% do container)
  containerSize: number; // px do quadrado/círculo do header
  shape: BrandLogoShape;
};

export const DEFAULT_LOGO_CONFIG: BrandLogoConfig = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  containerSize: 68,
  shape: "square",
};

function parseConfig(raw: string | null | undefined): BrandLogoConfig {
  if (!raw) return DEFAULT_LOGO_CONFIG;
  try {
    const v = JSON.parse(raw);
    return {
      zoom: clamp(Number(v.zoom) || 1, 0.3, 3),
      offsetX: clamp(Number(v.offsetX) || 0, -100, 100),
      offsetY: clamp(Number(v.offsetY) || 0, -100, 100),
      containerSize: clamp(Number(v.containerSize) || 68, 40, 160),
      shape: (v.shape === "round" || v.shape === "none" ? v.shape : "square") as BrandLogoShape,
    };
  } catch {
    return DEFAULT_LOGO_CONFIG;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function useBrandConfig() {
  const [compactUrl, setCompactUrl] = useState<string>(defaultLogo);
  const [fullUrl, setFullUrl] = useState<string>(defaultLogo);
  const [config, setConfig] = useState<BrandLogoConfig>(DEFAULT_LOGO_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", [KEY, FULL_KEY, CONFIG_KEY] as string[]);
    let compact = defaultLogo;
    let full = defaultLogo;
    let cfgRaw: string | null = null;
    for (const row of data ?? []) {
      if (row.key === KEY && row.value) compact = row.value;
      if (row.key === FULL_KEY && row.value) full = row.value;
      if (row.key === CONFIG_KEY) cfgRaw = row.value;
    }
    // se não houver versão "full" cadastrada, reaproveita a compacta
    if (full === defaultLogo && compact !== defaultLogo) full = compact;
    setCompactUrl(compact);
    setFullUrl(full);
    setConfig(parseConfig(cfgRaw));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { compactUrl, fullUrl, config, loading, refresh };
}

export async function saveBrandLogoConfig(cfg: BrandLogoConfig): Promise<void> {
  const { error } = await supabase.from("app_settings").upsert({
    key: CONFIG_KEY,
    value: JSON.stringify(cfg),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

const TEXT_KEYS = ["brand.title", "brand.subtitle", "brand.period"] as const;

export type BrandText = {
  title: string;
  subtitle: string;
  period: string;
};

const DEFAULT_BRAND_TEXT: BrandText = {
  title: "United Performance",
  subtitle: "Painel comercial da equipe",
  period: "Mês atual",
};

export function useBrandText() {
  const [text, setText] = useState<BrandText>(DEFAULT_BRAND_TEXT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", TEXT_KEYS as unknown as string[]);
    const next = { ...DEFAULT_BRAND_TEXT };
    for (const row of data ?? []) {
      if (row.key === "brand.title" && row.value) next.title = row.value;
      if (row.key === "brand.subtitle" && row.value) next.subtitle = row.value;
      if (row.key === "brand.period" && row.value) next.period = row.value;
    }
    setText(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { text, loading, refresh };
}

export async function saveBrandText(next: BrandText): Promise<void> {
  const now = new Date().toISOString();
  const rows = [
    { key: "brand.title", value: next.title, updated_at: now },
    { key: "brand.subtitle", value: next.subtitle, updated_at: now },
    { key: "brand.period", value: next.period, updated_at: now },
  ];
  const { error } = await supabase.from("app_settings").upsert(rows);
  if (error) throw error;
}
