"use client";

import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { BarRow } from "@/components/ui/BarRow";
import { StatsRow } from "@/components/ui/StatCard";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { formatDate, formatMontantSigne } from "@/lib/format";
import type { CentreDashboard, StatutJour } from "@/types/report";

function StatutBanner({ statut }: { statut: StatutJour }) {
  if (statut === "NON_DECLARE") {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3.5 rounded-xl border border-amber-200 bg-amber-50 px-4.5 py-3 text-sm text-amber-800">
        <span className="text-lg" aria-hidden>⏳</span>
        <p className="flex-1">
          <b className="font-bold">Aucune déclaration aujourd&apos;hui.</b>{" "}
          Saisissez vos opérations ou déclarez une journée sans mouvement.
        </p>
        <Link href="/centre/declaration-du-jour" className="btn-ghost">
          Aucune opération
        </Link>
      </div>
    );
  }
  return (
    <div className="mb-5 flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4.5 py-3 text-sm text-emerald-800">
      <span className="text-lg" aria-hidden>✓</span>
      <p>
        {statut === "DECLARE_AVEC_MOUVEMENT"
          ? "Journée déclarée : mouvements enregistrés."
          : "Journée déclarée : aucune opération."}
      </p>
    </div>
  );
}

export default function TableauDeBordPage() {
  const { data, loading, error } = useApi<CentreDashboard>("/centre/dashboard/");

  if (loading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  const maxCategorie = Math.max(
    1,
    ...data.par_categorie.map((c) => Number(c.total) || 0),
  );

  return (
    <div>
      <PageHeader
        crumb={data.centre.nom}
        title="Tableau de bord"
        action={{ href: "/centre/operations/nouvelle", label: "+ Saisir des opérations" }}
      />

      <StatutBanner statut={data.statut_jour} />
      <StatsRow totaux={data.totaux} />

      <div className="grid gap-3.5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="card">
          <h2 className="px-4 pt-3.5 text-sm font-bold">Dernières opérations</h2>
          {data.dernieres_operations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              Aucune opération enregistrée.
            </p>
          ) : (
            <ul className="py-1.5">
              {data.dernieres_operations.map((operation) => (
                <li
                  key={operation.id}
                  className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 first:border-t-0"
                >
                  <span
                    className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg text-[13px] font-bold ${
                      operation.type_operation === "REVENU"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                    aria-hidden
                  >
                    {operation.type_operation === "REVENU" ? "↓" : "↑"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {operation.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(operation.date_operation)}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      operation.type_operation === "REVENU"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {formatMontantSigne(operation.montant, operation.type_operation)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              href="/centre/operations"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Voir toutes les opérations
            </Link>
          </div>
        </section>

        <section className="card">
          <h2 className="px-4 pt-3.5 text-sm font-bold">Répartition par catégorie</h2>
          {data.par_categorie.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              Rien à afficher pour le moment.
            </p>
          ) : (
            <div className="space-y-2.5 px-4 py-3.5">
              {data.par_categorie.map((ligne) => (
                <BarRow
                  key={ligne.category_id}
                  label={ligne.category}
                  value={ligne.total}
                  ratio={(Number(ligne.total) || 0) / maxCategorie}
                  tone={ligne.type_operation === "REVENU" ? "revenu" : "depense"}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
