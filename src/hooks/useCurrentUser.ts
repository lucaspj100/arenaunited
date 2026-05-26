import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "diretor" | "vendedor" | null;

export type CurrentUser = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: Role;
  isStaff: boolean;
  sellerId: string | null;
};

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({
    loading: true,
    userId: null,
    email: null,
    role: null,
    isStaff: false,
    sellerId: null,
  });

  useEffect(() => {
    let mounted = true;

    const load = async (uid: string | null, email: string | null) => {
      if (!uid) {
        if (mounted)
          setState({ loading: false, userId: null, email: null, role: null, isStaff: false, sellerId: null });
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
        : roles.includes("diretor")
          ? "diretor"
          : roles.includes("vendedor")
            ? "vendedor"
            : null;
      if (mounted)
        setState({
          loading: false,
          userId: uid,
          email,
          role,
          isStaff: role === "admin" || role === "diretor",
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
