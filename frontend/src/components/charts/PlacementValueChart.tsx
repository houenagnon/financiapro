"use client";

import { useState } from "react";

import { AXIS, GRIDLINE, INK_MUTED } from "@/lib/chart-colors";
import { ticksY, versNombre } from "@/lib/chart-scale";
import { formatMontant } from "@/lib/format";
import type { PointValorisation } from "@/types/placement";

const COULEUR_INVESTI = AXIS; // ligne neutre : le capital de départ
const COULEUR_VALEUR = "#4f46e5"; // indigo-600 — même accent que le reste de l'app

const W = 640;
const H = 260;
const MARGE = { haut: 14, bas: 28, gauche: 48, droite: 12 };
const LARGEUR_TRACE = W - MARGE.gauche - MARGE.droite;
const HAUTEUR_TRACE = H - MARGE.haut - MARGE.bas;

function moisLabel(mois: string): string {
  const [annee, m] = mois.split("-");
  const date = new Date(Number(annee), Number(m) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

/** Courbe investi / valeur actuelle sur la série mensuelle reconstituée
 * (`serie_mensuelle` des rapports de placements) — même construction que
 * TimeSeriesChart, mais pour une paire de séries différente. */
export function PlacementValueChart({ data }: { data: PointValorisation[] }) {
  const [survole, setSurvole] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Aucune donnée de valorisation pour le moment.
      </p>
    );
  }

  const max = Math.max(1, ...data.flatMap((p) => [versNombre(p.investi), versNombre(p.valeur)]));
  const graduations = ticksY(max);
  const sommetEchelle = graduations[graduations.length - 1];

  const n = data.length;
  const xPour = (i: number) =>
    MARGE.gauche + (n === 1 ? LARGEUR_TRACE / 2 : (i * LARGEUR_TRACE) / (n - 1));
  const yPour = (valeur: number) =>
    MARGE.haut + HAUTEUR_TRACE - (valeur / sommetEchelle) * HAUTEUR_TRACE;

  const chemin = (cle: "investi" | "valeur") =>
    data.map((p, i) => `${i === 0 ? "M" : "L"}${xPour(i)},${yPour(versNombre(p[cle]))}`).join(" ");

  const largeurBande = LARGEUR_TRACE / n;
  const point = survole !== null ? data[survole] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Évolution du capital investi et de la valeur actuelle"
      >
        {graduations.map((g) => (
          <g key={g}>
            <line x1={MARGE.gauche} x2={W - MARGE.droite} y1={yPour(g)} y2={yPour(g)} stroke={GRIDLINE} strokeWidth={1} />
            <text x={MARGE.gauche - 8} y={yPour(g)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={INK_MUTED}>
              {formatMontant(g)}
            </text>
          </g>
        ))}

        {data.map((p, i) => (
          <text key={p.mois} x={xPour(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={INK_MUTED}>
            {moisLabel(p.mois)}
          </text>
        ))}

        <path d={chemin("investi")} fill="none" stroke={COULEUR_INVESTI} strokeWidth={2} strokeDasharray="4,3" strokeLinejoin="round" strokeLinecap="round" />
        <path d={chemin("valeur")} fill="none" stroke={COULEUR_VALEUR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {data.map((p, i) => (
          <g key={p.mois}>
            <circle cx={xPour(i)} cy={yPour(versNombre(p.investi))} r={3.5} fill={COULEUR_INVESTI} stroke="#fff" strokeWidth={1.5} />
            <circle cx={xPour(i)} cy={yPour(versNombre(p.valeur))} r={4} fill={COULEUR_VALEUR} stroke="#fff" strokeWidth={2} />
            <rect
              x={xPour(i) - largeurBande / 2}
              y={MARGE.haut}
              width={largeurBande}
              height={HAUTEUR_TRACE}
              fill="transparent"
              onMouseEnter={() => setSurvole(i)}
              onMouseLeave={() => setSurvole(null)}
            />
          </g>
        ))}
        {survole !== null && (
          <line x1={xPour(survole)} x2={xPour(survole)} y1={MARGE.haut} y2={MARGE.haut + HAUTEUR_TRACE} stroke={INK_MUTED} strokeWidth={1} strokeDasharray="3,3" />
        )}
      </svg>

      {point && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${(xPour(survole!) / W) * 100}%`, top: `${(MARGE.haut / H) * 100}%` }}
        >
          <p className="mb-1 font-semibold text-slate-700">{moisLabel(point.mois)}</p>
          <p style={{ color: COULEUR_INVESTI }}>Investi : {formatMontant(point.investi)}</p>
          <p style={{ color: COULEUR_VALEUR }}>Valeur actuelle : {formatMontant(point.valeur)}</p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_INVESTI }} /> Investi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_VALEUR }} /> Valeur actuelle
        </span>
      </div>
    </div>
  );
}
