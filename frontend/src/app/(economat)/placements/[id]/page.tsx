"use client";

import { use, useState } from "react";
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
} from "@/types/placement";

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
  onCreated,
  onCancel,
}: {
  portefeuilleId: number;
  types: TypePlacement[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
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

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="card mb-6 grid max-w-3xl gap-3 p-4 sm:grid-cols-2"
      noValidate
    >
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

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [actionEnCours, setActionEnCours] = useState<
    { type: "valoriser" | "cloturer"; placement: Placement } | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
          onCreated={() => {
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
            <div className="mb-5 grid gap-4 lg:grid-cols-2">
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-bold text-slate-900">Évolution</h2>
                <PlacementValueChart data={performance.data.serie_mensuelle} />
              </div>
              <div className="grid gap-4">
                <div className="card p-4">
                  <h2 className="mb-3 text-sm font-bold text-slate-900">Par niveau de risque</h2>
                  <CategoryBarChart data={repartitionRisque} />
                </div>
                <div className="card p-4">
                  <h2 className="mb-3 text-sm font-bold text-slate-900">Par type</h2>
                  <CategoryBarChart data={repartitionType} />
                </div>
              </div>
            </div>
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
            {placements.data.results.map((placement) => (
              <Tr key={placement.id}>
                <Td className="font-semibold">{placement.nom}</Td>
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
            ))}
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
