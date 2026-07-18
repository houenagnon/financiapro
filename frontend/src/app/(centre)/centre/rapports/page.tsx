"use client";

import { useState } from "react";

import { FilterBar, type PeriodeFiltres } from "@/components/reports/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsRow } from "@/components/ui/StatCard";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
  TypeBadge,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { formatMontant } from "@/lib/format";
import type { CentreDashboard } from "@/types/report";

export default function CentreRapportsPage() {
  const [filtres, setFiltres] = useState<PeriodeFiltres>({ date_debut: "", date_fin: "" });
  const { data, loading, error } = useApi<CentreDashboard>("/centre/dashboard/", {
    date_debut: filtres.date_debut || undefined,
    date_fin: filtres.date_fin || undefined,
  });

  return (
    <div>
      <PageHeader crumb={data?.centre.nom} title="Rapports du centre" />
      <FilterBar filtres={filtres} onChange={setFiltres} />

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && (
        <>
          <StatsRow totaux={data.totaux} />
          <h2 className="mb-3 text-sm font-bold text-slate-900">
            Totaux par catégorie
          </h2>
          {data.par_categorie.length === 0 ? (
            <EmptyMessage message="Aucune donnée sur cette période." />
          ) : (
            <TableCard>
              <thead>
                <tr>
                  <Th>Catégorie</Th>
                  <Th>Nature</Th>
                  <Th right>Total</Th>
                </tr>
              </thead>
              <tbody>
                {data.par_categorie.map((ligne) => (
                  <Tr key={ligne.category_id}>
                    <Td className="font-semibold">{ligne.category}</Td>
                    <Td>
                      <TypeBadge type={ligne.type_operation} />
                    </Td>
                    <Td
                      right
                      className={`font-bold tabular-nums ${
                        ligne.type_operation === "REVENU"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {formatMontant(ligne.total)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
          )}
        </>
      )}
    </div>
  );
}
