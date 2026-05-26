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
