"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/stores/auth-store";

/** Aiguillage post-connexion : chaque rôle a son espace d'accueil. */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role === "ECONOMAT_CENTRAL") {
      router.replace("/dashboard");
    } else {
      router.replace("/centre/tableau-de-bord");
    }
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Chargement…
    </main>
  );
}
