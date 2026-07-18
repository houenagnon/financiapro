"use client";

import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { CentreDashboard, StatutJour } from "@/types/report";

function StatutJourBadge({ statut }: { statut: StatutJour }) {
  if (statut === "NON_DECLARE") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Aucune déclaration aujourd&apos;hui.{" "}
        <Link href="/centre/declaration-du-jour" className="font-medium underline">
          Déclarer maintenant
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
      {statut === "DECLARE_AVEC_MOUVEMENT"
        ? "Journée déclarée : mouvements enregistrés."
        : "Journée déclarée : aucune opération."}
    </div>
  );
}

function TotalCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export default function TableauDeBordPage() {
  const { data, loading, error } = useApi<CentreDashboard>("/centre/dashboard/");

  if (loading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title={data.centre.nom}
        action={{ href: "/centre/operations/nouvelle", label: "Nouvelle opération" }}
      />

      <div className="mb-6">
        <StatutJourBadge statut={data.statut_jour} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <TotalCard label="Revenus" value={data.totaux.revenus} tone="text-green-700" />
        <TotalCard label="Dépenses" value={data.totaux.depenses} tone="text-red-700" />
        <TotalCard label="Solde" value={data.totaux.solde} tone="text-gray-900" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-base font-medium text-gray-900">
            Dernières opérations
          </h2>
          {data.dernieres_operations.length === 0 && (
            <p className="text-sm text-gray-500">Aucune opération enregistrée.</p>
          )}
          <ul className="divide-y divide-gray-100">
            {data.dernieres_operations.map((operation) => (
              <li key={operation.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-900">{operation.category}</p>
                  <p className="text-xs text-gray-500">{operation.date_operation}</p>
                </div>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    operation.type_operation === "REVENU"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {operation.type_operation === "REVENU" ? "+" : "−"}
                  {operation.montant}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/centre/operations"
            className="mt-3 inline-block text-sm text-blue-700 hover:underline"
          >
            Voir toutes les opérations
          </Link>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-base font-medium text-gray-900">Par catégorie</h2>
          {data.par_categorie.length === 0 && (
            <p className="text-sm text-gray-500">Rien à afficher pour le moment.</p>
          )}
          <ul className="divide-y divide-gray-100">
            {data.par_categorie.map((ligne) => (
              <li key={ligne.category_id} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-900">{ligne.category}</span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    ligne.type_operation === "REVENU" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {ligne.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
