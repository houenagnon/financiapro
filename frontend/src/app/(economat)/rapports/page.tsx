"use client";

import { useState } from "react";

import { FilterBar, type PeriodeFiltres } from "@/components/reports/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { formatMontant } from "@/lib/format";
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

  const maxAbsSolde = Math.max(1, ...(data ?? []).map((c) => Math.abs(Number(c.solde) || 0)));

  return (
    <div>
      <PageHeader crumb="Économat central" title="Comparaison des centres" />
      <FilterBar filtres={filtres} onChange={setFiltres} />

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.length === 0 && (
        <EmptyMessage message="Aucune donnée sur cette période." />
      )}
      {data && data.length > 0 && (
        <TableCard>
          <thead>
            <tr>
              <Th className="w-8">#</Th>
              <Th>Centre</Th>
              <Th right>Revenus</Th>
              <Th right>Dépenses</Th>
              <Th className="w-[240px]">Solde</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((ligne, index) => {
              const solde = Number(ligne.solde) || 0;
              const ratio = Math.abs(solde) / maxAbsSolde;
              return (
                <Tr key={ligne.centre_id}>
                  <Td className="text-slate-400">{index + 1}</Td>
                  <Td className="font-semibold">{ligne.centre}</Td>
                  <Td right className="tabular-nums text-emerald-600">
                    {formatMontant(ligne.revenus)}
                  </Td>
                  <Td right className="tabular-nums text-rose-600">
                    {formatMontant(ligne.depenses)}
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className={`block h-full rounded-full ${
                            solde >= 0 ? "bg-emerald-600" : "bg-rose-600"
                          }`}
                          style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
                        />
                      </span>
                      <span className="font-bold tabular-nums">
                        {formatMontant(ligne.solde)}
                      </span>
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
