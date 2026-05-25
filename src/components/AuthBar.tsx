import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, ShieldCheck, User } from "lucide-react";
import { signOut, type Role } from "@/hooks/useCurrentUser";

export function AuthBar({
  role,
  email,
  userId,
}: {
  role: Role;
  email: string | null;
  userId: string | null;
}) {
  if (!userId) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
      >
        <LogIn className="size-3.5" /> Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-[11px] font-mono"
        title={email ?? ""}
      >
        {role === "admin" ? (
          <ShieldCheck className="size-3.5 text-primary" />
        ) : (
          <User className="size-3.5 text-muted-foreground" />
        )}
        <span className="uppercase tracking-wider">
          {role ?? "sem papel"}
        </span>
      </div>
      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70 transition"
        title="Sair"
      >
        <LogOut className="size-3.5" /> Sair
      </button>
    </div>
  );
}
