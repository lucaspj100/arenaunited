import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function generateTempPassword(length = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

/**
 * ADMIN ONLY: gera uma nova senha temporária para o usuário informado,
 * aplica via auth.admin e devolve a senha em texto puro UMA ÚNICA VEZ.
 */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;

    // Confirma que quem chamou é ADMIN
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (rolesErr) throw new Error(rolesErr.message);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Apenas o administrador pode gerar senhas temporárias.");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Garante que o usuário-alvo existe
    const { data: target, error: getErr } =
      await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (getErr || !target?.user) {
      throw new Error("Usuário não encontrado.");
    }

    const tempPassword = generateTempPassword(14);
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { password: tempPassword },
    );
    if (updErr) throw new Error(updErr.message);

    return {
      email: target.user.email ?? null,
      tempPassword,
    };
  });