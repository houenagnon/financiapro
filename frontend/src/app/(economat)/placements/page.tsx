"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { PlacementValueChart } from "@/components/charts/PlacementValueChart";
import { PlacementsSubNav } from "@/components/placements/PlacementsSubNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  ActiveBadge,
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api-client";
import { formatMontant } from "@/lib/format";
import type { Paginated } from "@/types/api";
import type { DashboardPlacements, Portefeuille } from "@/types/placement";

const portefeuilleSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  description: z.string(),
});
type PortefeuilleFormValues = z.infer<typeof portefeuilleSchema>;

function NouveauPortefeuilleForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PortefeuilleFormValues>({
    resolver: zodResolver(portefeuilleSchema),
    defaultValues: { description: "" },
  });

  const onSubmit = async (values: PortefeuilleFormValues) => {
    setServerError(null);
    try {
      await api("/portefeuilles/", { method: "POST", body: values });
      onCreated();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Création impossible.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="card mb-6 flex max-w-2xl flex-wrap items-end gap-3 p-4"
      noValidate
    >
      <div className="min-w-40 flex-1">
        <label className="block text-sm font-medium text-slate-700">
          Nom du portefeuille
          <input
            type="text"
            placeholder="Réserves diocésaines"
            {...register("nom")}
            className="input-base mt-1"
          />
        </label>
        {errors.nom && <p className="mt-1 text-sm text-rose-600">{errors.nom.message}</p>}
      </div>
      <div className="min-w-40 flex-1">
        <label className="block text-sm font-medium text-slate-700">
          Description (facultatif)
          <input type="text" {...register("description")} className="input-base mt-1" />
        </label>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          Créer
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Annuler
        </button>
      </div>
      {serverError && (
        <div className="w-full">
          <ErrorMessage message={serverError} />
        </div>
      )}
    </form>
  );
}

function OnboardingBanner() {
  return (
    <div className="card mb-6 max-w-2xl border-indigo-200 bg-indigo-50 p-5">
      <h2 className="mb-2 text-sm font-bold text-indigo-900">
        Comment démarrer avec les placements ?
      </h2>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-indigo-800">
        <li>
          <Link href="/placements/tresorerie" className="font-semibold hover:underline">
            Virez des fonds
          </Link>{" "}
          depuis un centre vers la trésorerie centrale.
        </li>
        <li>Créez un portefeuille avec le bouton ci-dessus.</li>
        <li>Achetez-y un premier placement, puis suivez sa valeur au fil du temps.</li>
      </ol>
    </div>
  );
}

export default function PlacementsPage() {
  const dashboard = useApi<DashboardPlacements>("/rapports/placements/");
  const portefeuilles = useApi<Paginated<Portefeuille>>("/portefeuilles/");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  const repartitionRisque = (dashboard.data?.par_risque ?? []).map((r) => ({
    label: r.label,
    value: Number(r.valeur) || 0,
  }));
  const repartitionType = (dashboard.data?.par_type ?? []).map((r) => ({
    label: r.label,
    value: Number(r.valeur) || 0,
  }));

  const rienEncore =
    dashboard.data !== null &&
    portefeuilles.data !== null &&
    Number(dashboard.data.solde_caisse) === 0 &&
    dashboard.data.nb_placements === 0 &&
    portefeuilles.data.results.length === 0;

  return (
    <div>
      <PageHeader crumb="Économat central" title="Placements">
        <button onClick={() => setFormulaireOuvert((v) => !v)} className="btn-primary">
          {formulaireOuvert ? "Fermer" : "+ Nouveau portefeuille"}
        </button>
      </PageHeader>
      <PlacementsSubNav />

      {rienEncore && <OnboardingBanner />}

      {formulaireOuvert && (
        <NouveauPortefeuilleForm
          onCreated={() => {
            setFormulaireOuvert(false);
            portefeuilles.reload();
            dashboard.reload();
          }}
          onCancel={() => setFormulaireOuvert(false)}
        />
      )}

      {dashboard.loading && <LoadingMessage />}
      {dashboard.error && <ErrorMessage message={dashboard.error} />}

      {dashboard.data && (
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Solde trésorerie centrale" value={dashboard.data.solde_caisse} />
          <StatCard label="Total investi" value={dashboard.data.total_investi} />
          <StatCard label="Valeur actuelle" value={dashboard.data.valeur_actuelle} />
          <StatCard
            label="Gain / perte"
            value={dashboard.data.gain_perte}
            tone={Number(dashboard.data.gain_perte) >= 0 ? "revenu" : "depense"}
            sub={`${dashboard.data.performance_pct} %`}
          />
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-900">Portefeuilles</h2>
      {portefeuilles.loading && <LoadingMessage />}
      {portefeuilles.error && <ErrorMessage message={portefeuilles.error} />}
      {portefeuilles.data && portefeuilles.data.results.length === 0 && !rienEncore && (
        <EmptyMessage message="Aucun portefeuille pour le moment. Créez-en un avec le bouton « Nouveau portefeuille » ci-dessus." />
      )}
      {portefeuilles.data && portefeuilles.data.results.length > 0 && (
        <TableCard>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>Description</Th>
              <Th right>Total investi</Th>
              <Th right>Valeur actuelle</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody>
            {portefeuilles.data.results.map((portefeuille) => {
              const detail = dashboard.data?.portefeuilles.find(
                (d) => d.id === portefeuille.id,
              );
              return (
                <Tr key={portefeuille.id}>
                  <Td>
                    <Link
                      href={`/placements/${portefeuille.id}`}
                      className="font-semibold text-indigo-600 hover:underline"
                    >
                      {portefeuille.nom}
                    </Link>
                  </Td>
                  <Td className="text-slate-500">{portefeuille.description || "—"}</Td>
                  <Td right>{detail ? formatMontant(detail.total_investi) : "—"}</Td>
                  <Td right>{detail ? formatMontant(detail.valeur_actuelle) : "—"}</Td>
                  <Td>
                    <ActiveBadge active={portefeuille.is_active} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableCard>
      )}

      {dashboard.data && dashboard.data.nb_placements > 0 && (
        <details className="card mt-6 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-900">
            Analyse détaillée (évolution, répartitions)
          </summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Évolution du portefeuille global
              </h3>
              <PlacementValueChart data={dashboard.data.serie_mensuelle} />
            </div>
            <div className="grid gap-4">
              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Répartition par niveau de risque
                </h3>
                <CategoryBarChart data={repartitionRisque} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Répartition par type de placement
                </h3>
                <CategoryBarChart data={repartitionType} />
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
