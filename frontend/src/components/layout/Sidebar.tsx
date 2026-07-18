"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/stores/auth-store";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ECONOMAT: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/centres", label: "Centres" },
  { href: "/types-centres", label: "Types de centre" },
  { href: "/categories", label: "Catégories" },
  { href: "/utilisateurs", label: "Utilisateurs" },
  { href: "/rapports", label: "Rapports" },
];

const NAV_CENTRE: NavItem[] = [
  { href: "/centre/tableau-de-bord", label: "Tableau de bord" },
  { href: "/centre/operations", label: "Opérations" },
  { href: "/centre/declaration-du-jour", label: "Déclaration du jour" },
  { href: "/centre/rapports", label: "Rapports" },
];

const NAV_CENTRE_ECONOME: NavItem[] = [
  ...NAV_CENTRE.slice(0, 3),
  { href: "/centre/assistants", label: "Assistants" },
  NAV_CENTRE[3],
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const items =
    user.role === "ECONOMAT_CENTRAL"
      ? NAV_ECONOMAT
      : user.role === "ECONOME_PRINCIPAL"
        ? NAV_CENTRE_ECONOME
        : NAV_CENTRE;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-5">
        <span className="text-lg font-semibold text-blue-700">Financiapro</span>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
