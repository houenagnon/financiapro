"use client";

import { useState } from "react";

import { CategoryBarChart, type CategoryBarDatum } from "./CategoryBarChart";
import { TimeSeriesChart } from "./TimeSeriesChart";
import type { PointMensuel } from "@/types/report";

type VueGraphique = "courbe" | "barres" | "repartition";

const ONGLETS: { id: VueGraphique; label: string }[] = [
  { id: "courbe", label: "Courbe" },
  { id: "barres", label: "Barres" },
  { id: "repartition", label: "Répartition" },
];

/** Carte graphique avec sélecteur de type — même donnée temporelle pour
 * courbe/barres, donnée catégorielle dédiée pour la répartition. */
export function ChartPanel({
  titre,
  serieMensuelle,
  repartitionRevenus,
  repartitionDepenses,
  repartitionTitre = "Répartition",
}: {
  titre: string;
  serieMensuelle: PointMensuel[];
  /** Séparées par nature : mélanger revenus/dépenses ferait perdre la
   * couleur sémantique verte/rose au profit de couleurs arbitraires. */
  repartitionRevenus: CategoryBarDatum[];
  repartitionDepenses: CategoryBarDatum[];
  repartitionTitre?: string;
}) {
  const [vue, setVue] = useState<VueGraphique>("courbe");

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">
          {vue === "repartition" ? repartitionTitre : titre}
        </h2>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              onClick={() => setVue(onglet.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                vue === onglet.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {onglet.label}
            </button>
          ))}
        </div>
      </div>

      {vue === "courbe" && <TimeSeriesChart data={serieMensuelle} variant="line" />}
      {vue === "barres" && <TimeSeriesChart data={serieMensuelle} variant="bar" />}
      {vue === "repartition" && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Revenus
            </p>
            <CategoryBarChart data={repartitionRevenus} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600">
              Dépenses
            </p>
            <CategoryBarChart data={repartitionDepenses} />
          </div>
        </div>
      )}
    </div>
  );
}
