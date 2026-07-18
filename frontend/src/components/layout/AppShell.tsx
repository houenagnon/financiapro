"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "@/stores/auth-store";
import { Icon } from "./icons";
import { Sidebar } from "./Sidebar";

/** Gabarit des espaces connectés : sidebar (desktop) / barre inférieure
 * (mobile) + topbar mobile + contenu. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile uniquement : marque + profil + déconnexion */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:hidden">
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-sm font-extrabold text-white">
              F
            </span>
            <span className="text-sm font-bold tracking-tight">Financiapro</span>
          </span>
          <span className="flex items-center gap-1">
            <Link
              href="/profil"
              className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600"
            >
              {user?.first_name}
            </Link>
            <button
              onClick={() => logout()}
              title="Déconnexion"
              className="rounded-lg p-2 text-slate-500"
            >
              <Icon name="logout" />
            </button>
          </span>
        </header>
        <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-7 md:pb-7">
          {children}
        </main>
      </div>
    </div>
  );
}
