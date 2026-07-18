"use client";

import { useState } from "react";

import { FilterBar, TotalsRow, type PeriodeFiltres } from "@/components/reports/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { Paginated } from "@/types/api";
import type { TypeCentre } from "@/types/centre";
import type { RapportConsolide } from "@/types/report";

export default function DashboardPage() {
  const [filtres, setFiltres] = useState<PeriodeFiltres>({ date_debut: "", date_fin: "" });
  const [typeCentre, setTypeCentre] = useState("");
  const types = useApi<Paginated<TypeCentre>>("/types-centres/");
  const { data, loading, error } = useApi<RapportConsolide>("/rapports/consolide/", {
    date_debut: filtres.date_debut || undefined,
    date_fin: filtres.date_fin || undefined,
    type_centre: typeCentre || undefined,
  });

  return (
    <div>
      <PageHeader title="Vue consolidée" />

      <FilterBar filtres={filtres} onChange={setFiltres}>
        <select
          value={typeCentre}
          onChange={(e) => setTypeCentre(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tous les types de centre</option>
          {(types.data?.results ?? []).map((type) => (
            <option key={type.id} value={type.id}>
              {type.libelle}
            </option>
          ))}
        </select>
      </FilterBar>

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && (
        <>
          <TotalsRow totaux={data.global} />
          <h2 className="mb-3 text-base font-medium text-gray-900">
            Par type de centre
          </h2>
          {data.par_type_centre.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucune donnée sur cette période.
            </p>
          ) : (
            <div className="max-w-3xl overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Type de centre</th>
                    <th className="px-4 py-3 text-right">Revenus</th>
                    <th className="px-4 py-3 text-right">Dépenses</th>
                    <th className="px-4 py-3 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.par_type_centre.map((ligne) => (
                    <tr key={ligne.type_centre_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ligne.type_centre}
                      </td>
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
        </>
      )}
    </div>
  );
}
