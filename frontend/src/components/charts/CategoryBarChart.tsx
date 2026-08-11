"use client";

import { useState } from "react";

import { couleurCategorielle, INK_MUTED } from "@/lib/chart-colors";
import { formatMontant } from "@/lib/format";

export interface CategoryBarDatum {
  label: string;
  value: number;
}

const MAX_SERIES = 8; // plafond de la palette catégorielle — le reste va dans "Autres"

/** Répartition part-du-tout en barres horizontales proportionnelles —
 * préféré à un anneau/donut : la longueur se compare bien mieux que
 * l'angle ou l'aire (voir skill dataviz, "part-to-whole"). */
export function CategoryBarChart({ data }: { data: CategoryBarDatum[] }) {
  const [survole, setSurvole] = useState<number | null>(null);

  const triees = [...data].sort((a, b) => b.value - a.value);
  let visibles = triees;
  if (triees.length > MAX_SERIES) {
    const tete = triees.slice(0, MAX_SERIES - 1);
    const reste = triees.slice(MAX_SERIES - 1).reduce((s, d) => s + d.value, 0);
    visibles = [...tete, { label: "Autres", value: reste }];
  }

  if (visibles.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Aucune donnée sur cette période.</p>;
  }

  const total = visibles.reduce((s, d) => s + d.value, 0) || 1;
  const max = Math.max(...visibles.map((d) => d.value), 1);

  return (
    <div className="space-y-2.5">
      {visibles.map((d, i) => {
        const largeur = Math.max(2, (d.value / max) * 100);
        const part = ((d.value / total) * 100).toFixed(0);
        const couleur = d.label === "Autres" ? INK_MUTED : couleurCategorielle(i);
        return (
          <div
            key={d.label}
            className="grid grid-cols-[minmax(100px,160px)_1fr_84px] items-center gap-2.5 text-[13px]"
            onMouseEnter={() => setSurvole(i)}
            onMouseLeave={() => setSurvole(null)}
          >
            <span className="truncate text-slate-700" title={d.label}>
              {d.label}
            </span>
            <span className="h-3 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full transition-opacity"
                style={{
                  width: `${largeur}%`,
                  background: couleur,
                  opacity: survole === null || survole === i ? 1 : 0.45,
                }}
              />
            </span>
            <span className="text-right tabular-nums text-slate-600">
              {formatMontant(d.value)}
              <span className="ml-1 text-slate-400">({part}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
