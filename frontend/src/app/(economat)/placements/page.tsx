"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { PlacementValueChart } from "@/components/charts/PlacementValueChart";
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

function NouveauPortefeuilleForm({ onCreated }: { onCreated: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PortefeuilleFormValues>({
    resolver: zodResolver(portefeuilleSchema),
    defaultValues: { description: "" },
  });

  const onSubmit = async (values: PortefeuilleFormValues) => {
    setServerError(null);
    try {
      await api("/portefeuilles/", { method: "POST", body: values });
      reset();
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
      <button type="submit" disabled={isSubmitting} className="btn-primary">
        Créer
      </button>
      {serverError && (
        <div className="w-full">
          <ErrorMessage message={serverError} />
        </div>
      )}
    </form>
  );
}

export default function PlacementsPage() {
  const dashboard = useApi<DashboardPlacements>("/rapports/placements/");
  const portefeuilles = useApi<Paginated<Portefeuille>>("/portefeuilles/");

  const repartitionRisque = (dashboard.data?.par_risque ?? []).map((r) => ({
    label: r.label,
    value: Number(r.valeur) || 0,
  }));
  const repartitionType = (dashboard.data?.par_type ?? []).map((r) => ({
    label: r.label,
    value: Number(r.valeur) || 0,
  }));

  return (
    <div>
      <PageHeader crumb="Économat central" title="Placements">
        <Link href="/placements/types" className="btn-ghost px-3 py-1.5">
          Types de placement
        </Link>
      </PageHeader>

      <NouveauPortefeuilleForm onCreated={() => portefeuilles.reload()} />

      {dashboard.loading && <LoadingMessage />}
      {dashboard.error && <ErrorMessage message={dashboard.error} />}

      {dashboard.data && (
        <>
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

          {dashboard.data.nb_placements > 0 && (
            <div className="mb-5 grid gap-4 lg:grid-cols-2">
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-bold text-slate-900">
                  Évolution du portefeuille global
                </h2>
                <PlacementValueChart data={dashboard.data.serie_mensuelle} />
              </div>
              <div className="grid gap-4">
                <div className="card p-4">
                  <h2 className="mb-3 text-sm font-bold text-slate-900">
                    Répartition par niveau de risque
                  </h2>
                  <CategoryBarChart data={repartitionRisque} />
                </div>
                <div className="card p-4">
                  <h2 className="mb-3 text-sm font-bold text-slate-900">
                    Répartition par type de placement
                  </h2>
                  <CategoryBarChart data={repartitionType} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-900">Portefeuilles</h2>
      {portefeuilles.loading && <LoadingMessage />}
      {portefeuilles.error && <ErrorMessage message={portefeuilles.error} />}
      {portefeuilles.data && portefeuilles.data.results.length === 0 && (
        <EmptyMessage message="Aucun portefeuille pour le moment. Créez-en un pour commencer à investir." />
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
    </div>
  );
}
