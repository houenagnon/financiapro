"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/placements", label: "Vue d'ensemble" },
  { href: "/placements/tresorerie", label: "Trésorerie" },
  { href: "/placements/types", label: "Types de placement" },
];

/** Sous-navigation du module Placements — affichée sur les 3 pages de
 * premier niveau (pas sur le détail d'un portefeuille) pour que la
 * trésorerie centrale et les placements se lisent comme un seul parcours
 * plutôt que deux zones sans lien. Même habillage que les onglets de
 * ChartPanel. */
export function PlacementsSubNav() {
  const pathname = usePathname();

  return (
    <div className="no-print mb-5 flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
      {ONGLETS.map((onglet) => (
        <Link
          key={onglet.href}
          href={onglet.href}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            pathname === onglet.href
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {onglet.label}
        </Link>
      ))}
    </div>
  );
}
