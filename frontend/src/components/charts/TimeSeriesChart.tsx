"use client";

import { useState } from "react";

import { COULEUR_DEPENSE, COULEUR_REVENU, GRIDLINE, INK_MUTED } from "@/lib/chart-colors";
import { ticksY, versNombre } from "@/lib/chart-scale";
import { formatMontant } from "@/lib/format";
import type { PointMensuel } from "@/types/report";

const W = 640;
const H = 260;
const MARGE = { haut: 14, bas: 28, gauche: 48, droite: 12 };
const LARGEUR_TRACE = W - MARGE.gauche - MARGE.droite;
const HAUTEUR_TRACE = H - MARGE.haut - MARGE.bas;

function moisLabel(mois: string): string {
  const [annee, m] = mois.split("-");
  const date = new Date(Number(annee), Number(m) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "short" });
}

/** Courbe ou barres groupées Revenus/Dépenses sur une série mensuelle —
 * même donnée, deux lectures. SVG maison (pas de librairie). */
export function TimeSeriesChart({
  data,
  variant,
}: {
  data: PointMensuel[];
  variant: "line" | "bar";
}) {
  const [survole, setSurvole] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Aucune donnée sur cette période.</p>;
  }

  const max = Math.max(1, ...data.flatMap((p) => [versNombre(p.revenus), versNombre(p.depenses)]));
  const graduations = ticksY(max);
  const sommetEchelle = graduations[graduations.length - 1];

  const n = data.length;
  const xPour = (i: number) => MARGE.gauche + (n === 1 ? LARGEUR_TRACE / 2 : (i * LARGEUR_TRACE) / (n - 1));
  const yPour = (valeur: number) => MARGE.haut + HAUTEUR_TRACE - (valeur / sommetEchelle) * HAUTEUR_TRACE;

  const chemin = (cle: "revenus" | "depenses") =>
    data.map((p, i) => `${i === 0 ? "M" : "L"}${xPour(i)},${yPour(versNombre(p[cle]))}`).join(" ");

  // Bandes pour les barres : chaque mois occupe une bande, deux barres dedans.
  const largeurBande = LARGEUR_TRACE / n;
  const largeurBarre = Math.min(22, largeurBande * 0.28);
  const point = survole !== null ? data[survole] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution mensuelle des revenus et dépenses">
        {graduations.map((g) => (
          <g key={g}>
            <line
              x1={MARGE.gauche} x2={W - MARGE.droite}
              y1={yPour(g)} y2={yPour(g)}
              stroke={GRIDLINE} strokeWidth={1}
            />
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

        {variant === "bar" &&
          data.map((p, i) => {
            const bandeX = MARGE.gauche + i * largeurBande;
            const centre = bandeX + largeurBande / 2;
            const hRevenu = (versNombre(p.revenus) / sommetEchelle) * HAUTEUR_TRACE;
            const hDepense = (versNombre(p.depenses) / sommetEchelle) * HAUTEUR_TRACE;
            const base = MARGE.haut + HAUTEUR_TRACE;
            return (
              <g key={p.mois} onMouseEnter={() => setSurvole(i)} onMouseLeave={() => setSurvole(null)}>
                <rect x={centre - largeurBarre - 2} y={base - hRevenu} width={largeurBarre} height={Math.max(hRevenu, 1)} rx={3} fill={COULEUR_REVENU} opacity={survole === null || survole === i ? 1 : 0.35} />
                <rect x={centre + 2} y={base - hDepense} width={largeurBarre} height={Math.max(hDepense, 1)} rx={3} fill={COULEUR_DEPENSE} opacity={survole === null || survole === i ? 1 : 0.35} />
                <rect x={bandeX} y={MARGE.haut} width={largeurBande} height={HAUTEUR_TRACE} fill="transparent" />
              </g>
            );
          })}

        {variant === "line" && (
          <>
            <path d={chemin("revenus")} fill="none" stroke={COULEUR_REVENU} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={chemin("depenses")} fill="none" stroke={COULEUR_DEPENSE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((p, i) => (
              <g key={p.mois}>
                <circle cx={xPour(i)} cy={yPour(versNombre(p.revenus))} r={4} fill={COULEUR_REVENU} stroke="#fff" strokeWidth={2} />
                <circle cx={xPour(i)} cy={yPour(versNombre(p.depenses))} r={4} fill={COULEUR_DEPENSE} stroke="#fff" strokeWidth={2} />
                <rect
                  x={xPour(i) - largeurBande / 2} y={MARGE.haut} width={largeurBande} height={HAUTEUR_TRACE}
                  fill="transparent"
                  onMouseEnter={() => setSurvole(i)}
                  onMouseLeave={() => setSurvole(null)}
                />
              </g>
            ))}
            {survole !== null && (
              <line x1={xPour(survole)} x2={xPour(survole)} y1={MARGE.haut} y2={MARGE.haut + HAUTEUR_TRACE} stroke={INK_MUTED} strokeWidth={1} strokeDasharray="3,3" />
            )}
          </>
        )}
      </svg>

      {point && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: `${(xPour(survole!) / W) * 100}%`,
            top: `${(MARGE.haut / H) * 100}%`,
          }}
        >
          <p className="mb-1 font-semibold text-slate-700">{moisLabel(point.mois)}</p>
          <p className="text-emerald-600">Revenus : {formatMontant(point.revenus)}</p>
          <p className="text-rose-600">Dépenses : {formatMontant(point.depenses)}</p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_REVENU }} /> Revenus
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_DEPENSE }} /> Dépenses
        </span>
      </div>
    </div>
  );
}
