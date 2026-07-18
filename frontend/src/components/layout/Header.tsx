"use client";

import Link from "next/link";

import { useAuth } from "@/stores/auth-store";

const ROLE_LABELS: Record<string, string> = {
  ECONOMAT_CENTRAL: "Économat central",
  ECONOME_PRINCIPAL: "Économe principal",
  ASSISTANT: "Assistant",
};

export function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="text-sm text-gray-500">{ROLE_LABELS[user.role]}</div>
      <div className="flex items-center gap-4">
        <Link
          href="/profil"
          className="text-sm font-medium text-gray-700 hover:text-blue-700"
        >
          {user.first_name} {user.last_name}
        </Link>
        <button
          onClick={() => logout()}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
