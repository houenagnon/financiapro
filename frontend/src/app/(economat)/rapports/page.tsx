"use client";

import { useState } from "react";

import { ChartPanel } from "@/components/charts/ChartPanel";
import { FilterBar, type PeriodeFiltres } from "@/components/reports/FilterBar";
import {
  POLICES,
  TAILLES,
  PrintControls,
  type PoliceImpression,
  type TailleImpression,
} from "@/components/reports/PrintControls";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { formatDate, formatMontant } from "@/lib/format";
import type { Paginated } from "@/types/api";
import type { TypeCentre } from "@/types/centre";
import type { ComparaisonCentres, RapportConsolide } from "@/types/report";

export default function RapportsPage() {
  const [filtres, setFiltres] = useState<PeriodeFiltres>({ date_debut: "", date_fin: "" });
  const [typeCentre, setTypeCentre] = useState("");
  const [police, setPolice] = useState<PoliceImpression>("sans");
  const [taille, setTaille] = useState<TailleImpression>("base");

  const types = useApi<Paginated<TypeCentre>>("/types-centres/");
  const periodeParams = {
    date_debut: filtres.date_debut || undefined,
    date_fin: filtres.date_fin || undefined,
    type_centre: typeCentre || undefined,
  };
  const { data, loading, error } = useApi<ComparaisonCentres>(
    "/rapports/comparaison-centres/",
    periodeParams,
  );
  // Fetché uniquement pour sa série mensuelle (déjà calculée par le back) —
  // même ChartPanel que sur la vue consolidée.
  const consolide = useApi<RapportConsolide>("/rapports/consolide/", periodeParams);

  const maxAbsSolde = Math.max(1, ...(data ?? []).map((c) => Math.abs(Number(c.solde) || 0)));
  const repartitionRevenus =
    data?.map((c) => ({ label: c.centre, value: Number(c.revenus) || 0 })) ?? [];
  const repartitionDepenses =
    data?.map((c) => ({ label: c.centre, value: Number(c.depenses) || 0 })) ?? [];

  return (
    <div>
      <PageHeader crumb="Économat central" title="Comparaison des centres" />

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterBar filtres={filtres} onChange={setFiltres} />
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
        </div>
        <PrintControls
          police={police}
          taille={taille}
          onPoliceChange={setPolice}
          onTailleChange={setTaille}
        />
      </div>

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.length === 0 && (
        <EmptyMessage message="Aucune donnée sur cette période." />
      )}
      {data && data.length > 0 && (
        <div
          className="print-area"
          style={{ fontFamily: POLICES[police], fontSize: TAILLES[taille] }}
        >
          <div className="mb-4 hidden border-b border-slate-300 pb-3 print:block">
            <p className="text-base font-bold">Comparaison des centres — Économat central</p>
            <p className="text-sm text-slate-500">
              Période : {filtres.date_debut ? formatDate(filtres.date_debut) : "origine"} au{" "}
              {filtres.date_fin ? formatDate(filtres.date_fin) : "aujourd'hui"} — imprimé le{" "}
              {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>

          <div className="mb-6">
            <ChartPanel
              titre="Évolution mensuelle (tous centres)"
              serieMensuelle={consolide.data?.serie_mensuelle ?? []}
              repartitionRevenus={repartitionRevenus}
              repartitionDepenses={repartitionDepenses}
              repartitionTitre="Répartition par centre"
            />
          </div>

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
        </div>
      )}
    </div>
  );
}
