"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/stores/auth-store";
import { Icon, type IconName } from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV_ECONOMAT: NavItem[] = [
  { href: "/dashboard", label: "Vue consolidée", icon: "dashboard" },
  { href: "/centres", label: "Centres", icon: "building" },
  { href: "/types-centres", label: "Types de centre", icon: "tags" },
  { href: "/categories", label: "Catégories", icon: "list" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: "users" },
  { href: "/rapports", label: "Rapports", icon: "chart" },
];

const NAV_CENTRE: NavItem[] = [
  { href: "/centre/tableau-de-bord", label: "Tableau de bord", icon: "dashboard" },
  { href: "/centre/operations", label: "Opérations", icon: "list" },
  { href: "/centre/declaration-du-jour", label: "Déclaration du jour", icon: "calendar" },
  { href: "/centre/rapports", label: "Rapports", icon: "chart" },
];

const NAV_CENTRE_ECONOME: NavItem[] = [
  ...NAV_CENTRE.slice(0, 3),
  { href: "/centre/assistants", label: "Assistants", icon: "users" },
  NAV_CENTRE[3],
];

const ROLE_LABELS: Record<string, string> = {
  ECONOMAT_CENTRAL: "Économat central",
  ECONOME_PRINCIPAL: "Économe principal",
  ASSISTANT: "Assistant",
};

function navFor(role: string): { section: string; items: NavItem[] } {
  if (role === "ECONOMAT_CENTRAL")
    return { section: "Économat central", items: NAV_ECONOMAT };
  if (role === "ECONOME_PRINCIPAL")
    return { section: "Mon centre", items: NAV_CENTRE_ECONOME };
  return { section: "Mon centre", items: NAV_CENTRE };
}

function initiales(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  const { section, items } = navFor(user.role);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop : sidebar sombre */}
      <aside className="hidden w-[230px] shrink-0 flex-col bg-slate-900 p-3 text-slate-300 md:flex">
        <div className="flex items-center gap-2.5 px-3 pb-5 pt-1">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-[15px] font-extrabold text-white">
            F
          </span>
          <span className="text-base font-bold tracking-tight text-white">
            Financiapro
          </span>
        </div>
        <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">
          {section}
        </p>
        <nav className="flex-1 space-y-0.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-slate-800 px-3 pt-3">
          <Link
            href="/profil"
            className="flex min-w-0 flex-1 items-center gap-2.5 py-1"
            title="Profil"
          >
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">
              {initiales(user.first_name, user.last_name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">
                {user.first_name} {user.last_name}
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          </Link>
          <button
            onClick={() => logout()}
            title="Déconnexion"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {/* Mobile : barre de navigation inférieure */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden">
        {items.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              isActive(item.href) ? "text-indigo-600" : "text-slate-500"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
