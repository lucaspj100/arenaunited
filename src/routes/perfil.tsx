import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArrowLeft, Camera, Loader2, Save, Trophy, KeyRound } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Meu perfil — Arena United" }] }),
});

function ProfilePage() {
  const { loading: userLoading, userId, sellerId, email } = useCurrentUser();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!userId) {
      navigate({ to: "/login" });
      return;
    }
    if (!sellerId) {
      setLoadingProfile(false);
      return;
    }
    supabase
      .from("sellers")
      .select("name,avatar")
      .eq("id", sellerId)
      .single()
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else {
          setName(data.name);
          setAvatar(data.avatar);
        }
        setLoadingProfile(false);
      });
  }, [userLoading, userId, sellerId, navigate]);

  const saveProfile = async () => {
    if (!sellerId) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase
      .from("sellers")
      .update({ name: name.trim() })
      .eq("id", sellerId);
    setSaving(false);
    if (error) setErr(error.message);
    else setMsg("Nome atualizado.");
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !sellerId || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr("A imagem deve ter no máximo 5MB.");
      return;
    }
    setUploading(true);
    setErr(null);
    setMsg(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setErr(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    const { error: updErr } = await supabase
      .from("sellers")
      .update({ avatar: publicUrl })
      .eq("id", sellerId);
    if (updErr) setErr(updErr.message);
    else {
      setAvatar(publicUrl);
      setMsg("Foto atualizada.");
    }
    setUploading(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwErr("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPw !== newPw2) {
      setPwErr("As senhas não coincidem.");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) setPwErr(error.message);
    else {
      setPwMsg("Senha atualizada com sucesso.");
      setNewPw("");
      setNewPw2("");
    }
  };

  if (userLoading || loadingProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin mr-2" /> Carregando…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-8">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-bronze flex items-center justify-center">
            <Trophy className="size-4 text-primary-foreground" />
          </div>
          <h1 className="font-display font-black text-xl">Meu perfil</h1>
        </div>
      </header>

      {!sellerId && (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Seu usuário ainda não está vinculado a um vendedor. Peça ao administrador para liberar seu acesso.
        </div>
      )}

      {sellerId && (
        <>
          <section className="rounded-2xl bg-card border border-border p-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="size-20 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center text-2xl font-display font-bold">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    (name?.[0] ?? "?").toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:opacity-90 disabled:opacity-60"
                  title="Trocar foto"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="font-mono">{email}</div>
                <div className="mt-1">JPG ou PNG, até 5MB.</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nome de exibição</label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={saveProfile}
                  disabled={saving || !name.trim()}
                  className="flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar
                </button>
              </div>
            </div>

            {msg && <p className="text-xs text-primary mt-3">{msg}</p>}
            {err && <p className="text-xs text-destructive mt-3">{err}</p>}
          </section>

          <form onSubmit={changePassword} className="rounded-2xl bg-card border border-border p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="size-4 text-primary" />
              <h2 className="font-display font-bold">Trocar senha</h2>
            </div>

            <label className="block">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Nova senha</div>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Confirmar nova senha</div>
              <input
                type="password"
                value={newPw2}
                onChange={(e) => setNewPw2(e.target.value)}
                className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            {pwMsg && <p className="text-xs text-primary">{pwMsg}</p>}
            {pwErr && <p className="text-xs text-destructive">{pwErr}</p>}

            <button
              type="submit"
              disabled={pwSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm font-semibold hover:bg-secondary/70 disabled:opacity-60"
            >
              {pwSaving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Atualizar senha
            </button>
          </form>
        </>
      )}
    </main>
  );
}