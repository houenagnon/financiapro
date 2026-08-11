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
import { RegistreTable } from "@/components/reports/RegistreTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsRow } from "@/components/ui/StatCard";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { flattenCategories } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { CategoryTree } from "@/types/finance";
import type { CentreDashboard, Registre } from "@/types/report";

const inputClass = "input-base w-auto";

export default function CentreRapportsPage() {
  const [periode, setPeriode] = useState<PeriodeFiltres>({ date_debut: "", date_fin: "" });
  const [tiers, setTiers] = useState("");
  const [category, setCategory] = useState("");
  const [police, setPolice] = useState<PoliceImpression>("sans");
  const [taille, setTaille] = useState<TailleImpression>("base");

  const categoriesRequest = useApi<CategoryTree[]>("/categories/tree/");
  const categories = flattenCategories(categoriesRequest.data ?? []);

  const params = {
    date_debut: periode.date_debut || undefined,
    date_fin: periode.date_fin || undefined,
    tiers: tiers || undefined,
    category: category || undefined,
  };
  const registre = useApi<Registre>("/centre/registre/", params);
  // La répartition par catégorie reste une vue macro sur la période seule
  // (non filtrée par tiers/catégorie, pour donner une vue d'ensemble stable).
  const dashboard = useApi<CentreDashboard>("/centre/dashboard/", {
    date_debut: periode.date_debut || undefined,
    date_fin: periode.date_fin || undefined,
  });

  const loading = registre.loading || dashboard.loading;
  const error = registre.error || dashboard.error;
  const repartitionRevenus =
    dashboard.data?.par_categorie
      .filter((c) => c.type_operation === "REVENU")
      .map((c) => ({ label: c.category, value: Number(c.total) || 0 })) ?? [];
  const repartitionDepenses =
    dashboard.data?.par_categorie
      .filter((c) => c.type_operation === "DEPENSE")
      .map((c) => ({ label: c.category, value: Number(c.total) || 0 })) ?? [];

  return (
    <div>
      <PageHeader crumb={dashboard.data?.centre.nom} title="Rapports du centre" />

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterBar filtres={periode} onChange={setPeriode} />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filtrer par tiers…"
            value={tiers}
            onChange={(e) => setTiers(e.target.value)}
            className={inputClass}
          />
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

      {registre.data && dashboard.data && (
        <div
          className="print-area"
          style={{ fontFamily: POLICES[police], fontSize: TAILLES[taille] }}
        >
          <div className="mb-4 hidden border-b border-slate-300 pb-3 print:block">
            <p className="text-base font-bold">{dashboard.data.centre.nom} — Registre</p>
            <p className="text-sm text-slate-500">
              Période : {periode.date_debut ? formatDate(periode.date_debut) : "origine"} au{" "}
              {periode.date_fin ? formatDate(periode.date_fin) : "aujourd'hui"} — imprimé le{" "}
              {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>

          <StatsRow totaux={dashboard.data.totaux} />

          <div className="mb-6">
            <ChartPanel
              titre="Évolution mensuelle"
              serieMensuelle={dashboard.data.serie_mensuelle}
              repartitionRevenus={repartitionRevenus}
              repartitionDepenses={repartitionDepenses}
              repartitionTitre="Répartition par catégorie (période)"
            />
          </div>

          <h2 className="mb-3 text-sm font-bold text-slate-900">
            Registre détaillé{tiers || category ? " (filtré)" : ""}
          </h2>
          <RegistreTable
            operations={registre.data.operations}
            soldeInitial={registre.data.solde_initial}
            totaux={registre.data.totaux}
            detailHref={(operation) => `/centre/operations/${operation.id}`}
          />
        </div>
      )}
    </div>
  );
}
