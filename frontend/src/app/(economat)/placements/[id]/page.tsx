"use client";

import Link from "next/link";
import { Fragment, use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { PlacementValueChart } from "@/components/charts/PlacementValueChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
  RisqueBadge,
  StatutPlacementBadge,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { formatDate, formatMontant } from "@/lib/format";
import type { Paginated } from "@/types/api";
import type {
  Placement,
  Portefeuille,
  PerformancePortefeuille,
  TypePlacement,
  ValorisationPlacement,
} from "@/types/placement";
import type { SoldeCaisse } from "@/types/tresorerie";

const NB_COLONNES = 9; // pour le colSpan de la ligne d'historique dépliée

const MONTANT_REGEX = /^\d+([.,]\d{1,2})?$/;
const champMontant = z.string().refine((v) => MONTANT_REGEX.test(v), "Montant invalide.");

// --- Formulaire d'achat --------------------------------------------------

const achatSchema = z.object({
  type_placement_id: z.coerce.number().min(1, "Type requis."),
  nom: z.string().min(1, "Le nom est requis."),
  niveau_risque: z.enum(["FAIBLE", "MODERE", "ELEVE"]),
  montant_investi: champMontant,
  date_acquisition: z.string().min(1, "Date requise."),
  notes: z.string(),
});
type AchatInput = z.input<typeof achatSchema>;
type AchatValues = z.output<typeof achatSchema>;

function NouveauPlacementForm({
  portefeuilleId,
  types,
  soldeCaisse,
  onCreated,
  onCancel,
}: {
  portefeuilleId: number;
  types: TypePlacement[];
  soldeCaisse: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AchatInput, unknown, AchatValues>({
    resolver: zodResolver(achatSchema),
    defaultValues: {
      niveau_risque: "FAIBLE",
      date_acquisition: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const onSubmit = async (values: AchatValues) => {
    setServerError(null);
    try {
      await api("/placements/", {
        method: "POST",
        body: {
          portefeuille_id: portefeuilleId,
          type_placement_id: values.type_placement_id,
          nom: values.nom,
          niveau_risque: values.niveau_risque,
          montant_investi: values.montant_investi.replace(",", "."),
          date_acquisition: values.date_acquisition,
          notes: values.notes,
        },
      });
      onCreated();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Achat impossible.",
      );
    }
  };

  const montantSaisi = watch("montant_investi");
  const insuffisant =
    Boolean(montantSaisi) &&
    MONTANT_REGEX.test(montantSaisi) &&
    Number(montantSaisi.replace(",", ".")) > Number(soldeCaisse);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="card mb-6 grid max-w-3xl gap-3 p-4 sm:grid-cols-2"
      noValidate
    >
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:col-span-2">
        Solde disponible en trésorerie centrale :{" "}
        <b className="tabular-nums">{formatMontant(soldeCaisse)}</b>
        {insuffisant && (
          <p className="mt-1 text-rose-600">
            Ce montant dépasse le solde disponible.{" "}
            <Link href="/placements/tresorerie" className="font-semibold hover:underline">
              Alimenter la trésorerie →
            </Link>
          </p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700">
          Nom du placement
          <input
            type="text"
            placeholder="Bon du Trésor 2026"
            {...register("nom")}
            className="input-base mt-1"
          />
        </label>
        {errors.nom && <p className="mt-1 text-sm text-rose-600">{errors.nom.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Type de placement
          <select {...register("type_placement_id")} className="input-base mt-1">
            <option value="">—</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.libelle}
              </option>
            ))}
          </select>
        </label>
        {errors.type_placement_id && (
          <p className="mt-1 text-sm text-rose-600">{errors.type_placement_id.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Niveau de risque
          <select {...register("niveau_risque")} className="input-base mt-1">
            <option value="FAIBLE">Faible</option>
            <option value="MODERE">Modéré</option>
            <option value="ELEVE">Élevé</option>
          </select>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Montant investi
          <input
            type="text"
            inputMode="decimal"
            placeholder="500000"
            {...register("montant_investi")}
            className="input-base mt-1"
          />
        </label>
        {errors.montant_investi && (
          <p className="mt-1 text-sm text-rose-600">{errors.montant_investi.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Date d&apos;acquisition
          <input
            type="date"
            {...register("date_acquisition")}
            className="input-base mt-1"
          />
        </label>
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700">
          Notes (facultatif)
          <textarea rows={2} {...register("notes")} className="input-base mt-1" />
        </label>
      </div>

      {serverError && (
        <div className="sm:col-span-2">
          <ErrorMessage message={serverError} />
        </div>
      )}

      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Achat…" : "Acheter ce placement"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Annuler
        </button>
      </div>
    </form>
  );
}

// --- Modales "Marquer" / "Clôturer" --------------------------------------

function ModalShell({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          aria-label="Fermer"
        >
          ✕
        </button>
        <h2 className="mb-4 text-base font-bold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

const valoriserSchema = z.object({
  date_valorisation: z.string().min(1, "Date requise."),
  valeur: champMontant,
});
type ValoriserValues = z.infer<typeof valoriserSchema>;

function ValoriserModal({
  placement,
  onDone,
  onCancel,
}: {
  placement: Placement;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ValoriserValues>({
    resolver: zodResolver(valoriserSchema),
    defaultValues: { date_valorisation: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (values: ValoriserValues) => {
    setServerError(null);
    try {
      await api(`/placements/${placement.id}/valoriser/`, {
        method: "POST",
        body: { ...values, valeur: values.valeur.replace(",", ".") },
      });
      onDone();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Marquage impossible.",
      );
    }
  };

  return (
    <ModalShell title={`Marquer « ${placement.nom} »`} onCancel={onCancel}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <label className="block text-sm font-medium text-slate-700">
          Date de valorisation
          <input
            type="date"
            {...register("date_valorisation")}
            className="input-base mt-1"
          />
        </label>
        {errors.date_valorisation && (
          <p className="text-sm text-rose-600">{errors.date_valorisation.message}</p>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Valeur actuelle
          <input
            type="text"
            inputMode="decimal"
            {...register("valeur")}
            className="input-base mt-1"
          />
        </label>
        {errors.valeur && <p className="text-sm text-rose-600">{errors.valeur.message}</p>}
        {serverError && <ErrorMessage message={serverError} />}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Enregistrement…" : "Marquer"}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">
            Annuler
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const clotureSchema = z.object({
  date_cloture: z.string().min(1, "Date requise."),
  montant_recupere: champMontant,
});
type ClotureValues = z.infer<typeof clotureSchema>;

function ClotureModal({
  placement,
  onDone,
  onCancel,
}: {
  placement: Placement;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClotureValues>({
    resolver: zodResolver(clotureSchema),
    defaultValues: { date_cloture: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (values: ClotureValues) => {
    setServerError(null);
    try {
      await api(`/placements/${placement.id}/cloturer/`, {
        method: "POST",
        body: { ...values, montant_recupere: values.montant_recupere.replace(",", ".") },
      });
      onDone();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Clôture impossible.",
      );
    }
  };

  return (
    <ModalShell title={`Clôturer « ${placement.nom} »`} onCancel={onCancel}>
      <p className="mb-3 text-xs text-slate-500">
        Rachat/vente du placement — le montant récupéré crédite la trésorerie
        centrale.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <label className="block text-sm font-medium text-slate-700">
          Date de clôture
          <input type="date" {...register("date_cloture")} className="input-base mt-1" />
        </label>
        {errors.date_cloture && (
          <p className="text-sm text-rose-600">{errors.date_cloture.message}</p>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Montant récupéré
          <input
            type="text"
            inputMode="decimal"
            {...register("montant_recupere")}
            className="input-base mt-1"
          />
        </label>
        {errors.montant_recupere && (
          <p className="text-sm text-rose-600">{errors.montant_recupere.message}</p>
        )}
        {serverError && <ErrorMessage message={serverError} />}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Clôture…" : "Clôturer"}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">
            Annuler
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// --- Page ------------------------------------------------------------------

function GainCell({ gainPerte, performancePct }: { gainPerte: string; performancePct: string }) {
  const positif = Number(gainPerte) >= 0;
  return (
    <span className={positif ? "text-emerald-600" : "text-rose-600"}>
      {positif ? "+" : ""}
      {formatMontant(gainPerte)}
      <span className="ml-1 text-xs opacity-75">
        ({positif ? "+" : ""}
        {performancePct}%)
      </span>
    </span>
  );
}

/** Historique des valorisations d'un placement, chargé uniquement à
 * l'ouverture (la ligne est démontée à la fermeture, donc pas de requête
 * tant qu'on ne l'a pas demandé). */
function HistoriquePlacement({ placementId }: { placementId: number }) {
  const { data, loading, error } = useApi<ValorisationPlacement[]>(
    `/placements/${placementId}/historique/`,
  );

  if (loading) return <p className="py-1 text-xs text-slate-400">Chargement…</p>;
  if (error) return <ErrorMessage message={error} />;
  if (!data || data.length === 0) {
    return (
      <p className="py-1 text-xs text-slate-400">
        Aucun marquage enregistré pour l&apos;instant.
      </p>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-slate-400">
          <th className="py-1 pr-4 font-semibold uppercase tracking-wide">Date</th>
          <th className="py-1 pr-4 font-semibold uppercase tracking-wide">Valeur</th>
          <th className="py-1 font-semibold uppercase tracking-wide">Notes</th>
        </tr>
      </thead>
      <tbody>
        {data.map((valorisation) => (
          <tr key={valorisation.id} className="border-t border-slate-200">
            <td className="py-1.5 pr-4 text-slate-500">
              {formatDate(valorisation.date_valorisation)}
            </td>
            <td className="py-1.5 pr-4 font-medium text-slate-800">
              {formatMontant(valorisation.valeur)}
            </td>
            <td className="py-1.5 text-slate-500">{valorisation.notes || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PortefeuilleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const portefeuilleId = Number(id);

  const { data: portefeuille, loading, error, reload } = useApi<Portefeuille>(
    `/portefeuilles/${id}/`,
  );
  const performance = useApi<PerformancePortefeuille>(`/portefeuilles/${id}/performance/`);
  const placements = useApi<Paginated<Placement>>("/placements/", {
    portefeuille: portefeuilleId,
  });
  const typesRequest = useApi<Paginated<TypePlacement>>("/types-placements/");
  const soldeCaisse = useApi<SoldeCaisse>("/tresorerie/solde/");

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [actionEnCours, setActionEnCours] = useState<
    { type: "valoriser" | "cloturer"; placement: Placement } | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historiquesOuverts, setHistoriquesOuverts] = useState<Set<number>>(new Set());

  const toggleHistorique = (placementId: number) => {
    setHistoriquesOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(placementId)) suivant.delete(placementId);
      else suivant.add(placementId);
      return suivant;
    });
  };

  const rafraichirTout = () => {
    performance.reload();
    placements.reload();
  };

  const toggleActive = async () => {
    if (!portefeuille) return;
    setActionError(null);
    try {
      await api(`/portefeuilles/${id}/`, {
        method: "PATCH",
        body: { is_active: !portefeuille.is_active },
      });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action impossible.");
    }
  };

  if (loading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} />;
  if (!portefeuille) return null;

  const repartitionRisque = (performance.data?.par_risque ?? []).map((r) => ({
    label: r.label,
    value: Number(r.valeur) || 0,
  }));
  const repartitionType = (performance.data?.par_type ?? []).map((r) => ({
    label: r.label,
    value: Number(r.valeur) || 0,
  }));
  const typesActifs = typesRequest.data?.results.filter((t) => t.is_active) ?? [];

  return (
    <div>
      <PageHeader crumb="Placements" title={portefeuille.nom}>
        <button onClick={toggleActive} className="btn-ghost px-3 py-1.5">
          {portefeuille.is_active ? "Désactiver" : "Réactiver"}
        </button>
        <button onClick={() => setFormulaireOuvert((v) => !v)} className="btn-primary">
          {formulaireOuvert ? "Fermer" : "+ Nouveau placement"}
        </button>
      </PageHeader>

      {actionError && <ErrorMessage message={actionError} />}

      {formulaireOuvert && (
        <NouveauPlacementForm
          portefeuilleId={portefeuilleId}
          types={typesActifs}
          soldeCaisse={soldeCaisse.data?.solde ?? "0"}
          onCreated={() => {
            soldeCaisse.reload();
            setFormulaireOuvert(false);
            rafraichirTout();
          }}
          onCancel={() => setFormulaireOuvert(false)}
        />
      )}

      {performance.data && (
        <>
          <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total investi" value={performance.data.total_investi} />
            <StatCard label="Valeur actuelle" value={performance.data.valeur_actuelle} />
            <StatCard
              label="Gain / perte"
              value={performance.data.gain_perte}
              tone={Number(performance.data.gain_perte) >= 0 ? "revenu" : "depense"}
              sub={`${performance.data.performance_pct} %`}
            />
            <StatCard
              label="Placements en cours"
              value={String(performance.data.nb_placements_en_cours)}
              tone="neutre"
            />
          </div>

          {performance.data.nb_placements > 0 && (
            <details className="card mb-5 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-900">
                Analyse détaillée (évolution, répartitions)
              </summary>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Évolution</h3>
                  <PlacementValueChart data={performance.data.serie_mensuelle} />
                </div>
                <div className="grid gap-4">
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-slate-900">Par niveau de risque</h3>
                    <CategoryBarChart data={repartitionRisque} />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-slate-900">Par type</h3>
                    <CategoryBarChart data={repartitionType} />
                  </div>
                </div>
              </div>
            </details>
          )}
        </>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-900">Placements</h2>
      {placements.loading && <LoadingMessage />}
      {placements.error && <ErrorMessage message={placements.error} />}
      {placements.data && placements.data.results.length === 0 && (
        <EmptyMessage message="Aucun placement dans ce portefeuille pour le moment." />
      )}
      {placements.data && placements.data.results.length > 0 && (
        <TableCard>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>Type</Th>
              <Th>Risque</Th>
              <Th right>Investi</Th>
              <Th right>Valeur actuelle</Th>
              <Th right>Gain / perte</Th>
              <Th>Statut</Th>
              <Th>Dernier marquage</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {placements.data.results.map((placement) => {
              const ouvert = historiquesOuverts.has(placement.id);
              return (
                <Fragment key={placement.id}>
                  <Tr>
                    <Td>
                      <span className="font-semibold text-slate-900">{placement.nom}</span>
                      <button
                        onClick={() => toggleHistorique(placement.id)}
                        className="mt-0.5 block text-xs text-slate-400 hover:text-indigo-600 hover:underline"
                      >
                        {ouvert ? "▾ masquer l'historique" : "▸ historique"}
                      </button>
                    </Td>
                    <Td className="text-slate-600">{placement.type_placement.libelle}</Td>
                    <Td>
                      <RisqueBadge niveau={placement.niveau_risque} />
                    </Td>
                    <Td right>{formatMontant(placement.montant_investi)}</Td>
                    <Td right>{formatMontant(placement.valeur_actuelle)}</Td>
                    <Td right>
                      <GainCell
                        gainPerte={placement.gain_perte}
                        performancePct={placement.performance_pct}
                      />
                    </Td>
                    <Td>
                      <StatutPlacementBadge statut={placement.statut} />
                    </Td>
                    <Td className="text-slate-500">
                      {placement.derniere_valorisation
                        ? formatDate(placement.derniere_valorisation.date_valorisation)
                        : "—"}
                    </Td>
                    <Td right>
                      {placement.statut === "EN_COURS" && (
                        <span className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setActionEnCours({ type: "valoriser", placement })}
                            className="text-sm text-indigo-600 hover:underline"
                          >
                            Marquer
                          </button>
                          <button
                            onClick={() => setActionEnCours({ type: "cloturer", placement })}
                            className="text-sm text-amber-700 hover:underline"
                          >
                            Clôturer
                          </button>
                        </span>
                      )}
                    </Td>
                  </Tr>
                  {ouvert && (
                    <tr>
                      <td colSpan={NB_COLONNES} className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <HistoriquePlacement placementId={placement.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </TableCard>
      )}

      {actionEnCours?.type === "valoriser" && (
        <ValoriserModal
          placement={actionEnCours.placement}
          onDone={() => {
            setActionEnCours(null);
            rafraichirTout();
          }}
          onCancel={() => setActionEnCours(null)}
        />
      )}
      {actionEnCours?.type === "cloturer" && (
        <ClotureModal
          placement={actionEnCours.placement}
          onDone={() => {
            setActionEnCours(null);
            rafraichirTout();
          }}
          onCancel={() => setActionEnCours(null)}
        />
      )}
    </div>
  );
}
