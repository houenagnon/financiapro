"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/stores/auth-store";
import type { Role } from "@/types/auth";

/** Défense en profondeur côté UI : redirige si le rôle n'est pas autorisé.
 * La sécurité réelle reste portée par l'API (permissions DRF).
 */
export function RoleGuard({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace("/");
    }
  }, [user, loading, roles, router]);

  if (loading || !user || !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Chargement…
      </div>
    );
  }
  return <>{children}</>;
}
