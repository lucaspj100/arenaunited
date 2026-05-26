import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/united-logo.jpg";

const KEY = "brand.logo_url";

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

export async function uploadBrandLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `logo-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("branding")
    .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
  const url = pub.publicUrl;
  const { error: setErr } = await supabase
    .from("app_settings")
    .upsert({ key: KEY, value: url, updated_at: new Date().toISOString() });
  if (setErr) throw setErr;
  return url;
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
