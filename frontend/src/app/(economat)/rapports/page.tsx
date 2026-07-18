"use client";

import { useState } from "react";

import { FilterBar, type PeriodeFiltres } from "@/components/reports/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { ComparaisonCentres } from "@/types/report";

export default function RapportsPage() {
  const [filtres, setFiltres] = useState<PeriodeFiltres>({ date_debut: "", date_fin: "" });
  const { data, loading, error } = useApi<ComparaisonCentres>(
    "/rapports/comparaison-centres/",
    {
      date_debut: filtres.date_debut || undefined,
      date_fin: filtres.date_fin || undefined,
    },
  );

  return (
    <div>
      <PageHeader title="Comparaison des centres" />
      <FilterBar filtres={filtres} onChange={setFiltres} />

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.length === 0 && (
        <EmptyMessage message="Aucune donnée sur cette période." />
      )}
      {data && data.length > 0 && (
        <div className="max-w-3xl overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Centre</th>
                <th className="px-4 py-3 text-right">Revenus</th>
                <th className="px-4 py-3 text-right">Dépenses</th>
                <th className="px-4 py-3 text-right">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((ligne, index) => (
                <tr key={ligne.centre_id}>
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{ligne.centre}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">
                    {ligne.revenus}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-700">
                    {ligne.depenses}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {ligne.solde}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
