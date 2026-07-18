"use client";

import { useState } from "react";

import { FilterBar, TotalsRow, type PeriodeFiltres } from "@/components/reports/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { CentreDashboard } from "@/types/report";

export default function CentreRapportsPage() {
  const [filtres, setFiltres] = useState<PeriodeFiltres>({ date_debut: "", date_fin: "" });
  const { data, loading, error } = useApi<CentreDashboard>("/centre/dashboard/", {
    date_debut: filtres.date_debut || undefined,
    date_fin: filtres.date_fin || undefined,
  });

  return (
    <div>
      <PageHeader title="Rapports du centre" />
      <FilterBar filtres={filtres} onChange={setFiltres} />

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && (
        <>
          <TotalsRow totaux={data.totaux} />
          <h2 className="mb-3 text-base font-medium text-gray-900">
            Totaux par catégorie
          </h2>
          {data.par_categorie.length === 0 ? (
            <EmptyMessage message="Aucune donnée sur cette période." />
          ) : (
            <div className="max-w-2xl overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3">Nature</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.par_categorie.map((ligne) => (
                    <tr key={ligne.category_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ligne.category}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ligne.type_operation === "REVENU" ? "Revenu" : "Dépense"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium tabular-nums ${
                          ligne.type_operation === "REVENU"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {ligne.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
