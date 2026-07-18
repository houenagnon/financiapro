"use client";

import { useState } from "react";

import { FilterBar, type PeriodeFiltres } from "@/components/reports/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsRow } from "@/components/ui/StatCard";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { formatMontant } from "@/lib/format";
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
      <PageHeader crumb="Économat central" title="Vue consolidée" />

      <FilterBar filtres={filtres} onChange={setFiltres}>
        <select
          value={typeCentre}
          onChange={(e) => setTypeCentre(e.target.value)}
          className="input-base w-auto"
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
          <StatsRow totaux={data.global} />
          <h2 className="mb-3 text-sm font-bold text-slate-900">
            Par type de centre
          </h2>
          {data.par_type_centre.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune donnée sur cette période.</p>
          ) : (
            <TableCard>
              <thead>
                <tr>
                  <Th>Type de centre</Th>
                  <Th right>Revenus</Th>
                  <Th right>Dépenses</Th>
                  <Th right>Solde</Th>
                </tr>
              </thead>
              <tbody>
                {data.par_type_centre.map((ligne) => (
                  <Tr key={ligne.type_centre_id}>
                    <Td className="font-semibold">{ligne.type_centre}</Td>
                    <Td right className="tabular-nums text-emerald-600">
                      {formatMontant(ligne.revenus)}
                    </Td>
                    <Td right className="tabular-nums text-rose-600">
                      {formatMontant(ligne.depenses)}
                    </Td>
                    <Td right className="font-bold tabular-nums">
                      {formatMontant(ligne.solde)}
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
