import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "diretor" | "ceo" | "presidente" | "vendedor" | null;

export type CurrentUser = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: Role;
  isStaff: boolean;
  isDirectorLike: boolean;
  isFranchisee: boolean;
  isManager: boolean;
  sellerId: string | null;
};

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({
    loading: true,
    userId: null,
    email: null,
    role: null,
    isStaff: false,
    isDirectorLike: false,
    isFranchisee: false,
    isManager: false,
    sellerId: null,
  });

  useEffect(() => {
    let mounted = true;

    const load = async (uid: string | null, email: string | null) => {
      if (!uid) {
        if (mounted)
          setState({
            loading: false,
            userId: null,
            email: null,
            role: null,
            isStaff: false,
            isDirectorLike: false,
            isFranchisee: false,
            isManager: false,
            sellerId: null,
          });
        return;
      }
      const [rolesRes, sellerRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("sellers").select("id").eq("user_id", uid).maybeSingle(),
      ]);
      if (rolesRes.error) console.error("user_roles error", rolesRes.error);
      const roles = (rolesRes.data ?? []).map((r) => r.role);
      const role: Role = roles.includes("admin")
        ? "admin"
        : roles.includes("ceo")
          ? "ceo"
          : roles.includes("presidente")
            ? "presidente"
            : roles.includes("diretor")
              ? "diretor"
              : roles.includes("vendedor") || roles.includes("franqueado")
                ? "vendedor"
                : null;
      const isStaff =
        role === "admin" || role === "diretor" || role === "ceo" || role === "presidente";
      const isDirectorLike =
        role === "diretor" || role === "ceo" || role === "presidente";
      const isFranchisee = roles.includes("franqueado");
      const isManager = isDirectorLike || isFranchisee || role === "admin";
      if (mounted)
        setState({
          loading: false,
          userId: uid,
          email,
          role,
          isStaff,
          isDirectorLike,
          isFranchisee,
          isManager,
          sellerId: sellerRes.data?.id ?? null,
        });
    };

    supabase.auth.getUser().then(({ data }) => {
      load(data.user?.id ?? null, data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}
