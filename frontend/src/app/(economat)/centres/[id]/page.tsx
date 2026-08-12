"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDangerModal } from "@/components/ui/ConfirmDangerModal";
import {
  ActiveBadge,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import type { Paginated } from "@/types/api";
import type { Centre, CentreStats, TypeCentre } from "@/types/centre";

const editSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  type_centre_id: z.coerce.number().min(1, "Le type de centre est requis."),
  description: z.string(),
});

type EditInput = z.input<typeof editSchema>;
type EditValues = z.output<typeof editSchema>;

const inputClass = "input-base mt-1";

function EditForm({
  centre,
  types,
  onSaved,
  onCancel,
}: {
  centre: Centre;
  types: TypeCentre[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditInput, unknown, EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nom: centre.nom,
      type_centre_id: centre.type_centre.id,
      description: centre.description,
    },
  });

  const onSubmit = async (values: EditValues) => {
    setServerError(null);
    try {
      await api(`/centres/${centre.id}/`, { method: "PATCH", body: values });
      onSaved();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Enregistrement impossible.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card max-w-xl space-y-4 p-5" noValidate>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Nom du centre
          <input type="text" {...register("nom")} className={inputClass} />
        </label>
        {errors.nom && <p className="mt-1 text-sm text-rose-600">{errors.nom.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Type de centre
          <select {...register("type_centre_id")} className={inputClass}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.libelle}
              </option>
            ))}
          </select>
        </label>
        {errors.type_centre_id && (
          <p className="mt-1 text-sm text-rose-600">{errors.type_centre_id.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Description (facultatif)
          <textarea rows={3} {...register("description")} className={inputClass} />
        </label>
      </div>

      {serverError && <ErrorMessage message={serverError} />}

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function CentreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: centre, loading, error, reload } = useApi<Centre>(`/centres/${id}/`);
  const typesRequest = useApi<Paginated<TypeCentre>>("/types-centres/");
  const [actionError, setActionError] = useState<string | null>(null);
  const [enEdition, setEnEdition] = useState(false);

  // Suppression définitive : l'Économat central peut supprimer n'importe
  // quel centre sans blocage, mais doit d'abord voir les conséquences
  // (opérations et comptes qui seront supprimés avec).
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);
  const [statsSuppression, setStatsSuppression] = useState<CentreStats | null>(null);
  const [chargementStats, setChargementStats] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [suppressionErreur, setSuppressionErreur] = useState<string | null>(null);

  const toggleActive = async () => {
    if (!centre) return;
    setActionError(null);
    try {
      await api(`/centres/${id}/`, {
        method: "PATCH",
        body: { is_active: !centre.is_active },
      });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action impossible.");
    }
  };

  const ouvrirConfirmationSuppression = async () => {
    setSuppressionErreur(null);
    setSuppressionOuverte(true);
    setChargementStats(true);
    try {
      setStatsSuppression(await api<CentreStats>(`/centres/${id}/stats/`));
    } catch {
      setStatsSuppression(null);
    } finally {
      setChargementStats(false);
    }
  };

  const confirmerSuppression = async () => {
    setSuppressionEnCours(true);
    setSuppressionErreur(null);
    try {
      await api(`/centres/${id}/`, { method: "DELETE" });
      router.replace("/centres");
    } catch (err) {
      setSuppressionErreur(
        err instanceof ApiClientError ? err.message : "Suppression impossible.",
      );
      setSuppressionEnCours(false);
    }
  };

  if (loading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} />;
  if (!centre) return null;

  if (enEdition) {
    return (
      <div>
        <PageHeader title={`Modifier ${centre.nom}`} />
        {typesRequest.data && (
          <EditForm
            centre={centre}
            types={typesRequest.data.results.filter((t) => t.is_active)}
            onSaved={() => {
              setEnEdition(false);
              reload();
            }}
            onCancel={() => setEnEdition(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={centre.nom}>
        <button onClick={() => setEnEdition(true)} className="btn-ghost px-3 py-1.5">
          Modifier
        </button>
        <button onClick={toggleActive} className="btn-ghost px-3 py-1.5">
          {centre.is_active ? "Désactiver" : "Réactiver"}
        </button>
        <button
          onClick={ouvrirConfirmationSuppression}
          className="btn-ghost border-rose-300 px-3 py-1.5 text-rose-700 hover:bg-rose-50"
        >
          Supprimer
        </button>
      </PageHeader>

      <p className="mb-4 max-w-2xl text-xs text-slate-400">
        La suppression est définitive et supprime aussi les opérations et
        les comptes du centre — les conséquences sont détaillées avant
        confirmation.
      </p>

      {actionError && <ErrorMessage message={actionError} />}

      <ConfirmDangerModal
        open={suppressionOuverte}
        title={`Supprimer « ${centre.nom} » ?`}
        confirmLabel="Supprimer définitivement"
        confirming={suppressionEnCours}
        onCancel={() => setSuppressionOuverte(false)}
        onConfirm={confirmerSuppression}
      >
        {chargementStats ? (
          <p>Vérification des données liées…</p>
        ) : (
          <>
            <p>Cette action est irréversible. Seront supprimés avec le centre :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <b>{statsSuppression?.nb_transactions ?? "?"}</b> opération(s)
                financière(s) enregistrée(s)
              </li>
              <li>
                <b>{statsSuppression?.nb_membres ?? "?"}</b> compte(s) associé(s)
                (économe principal et assistants)
              </li>
            </ul>
          </>
        )}
        {suppressionErreur && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {suppressionErreur}
          </p>
        )}
      </ConfirmDangerModal>

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Type de centre</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {centre.type_centre.libelle}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Statut</p>
          <p className="mt-1">
            <ActiveBadge active={centre.is_active} />
          </p>
        </div>
        <div className="card p-4 sm:col-span-2">
          <p className="text-xs uppercase text-slate-500">Économe principal</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {centre.econome_principal.first_name} {centre.econome_principal.last_name}
          </p>
          <p className="text-sm text-slate-500">{centre.econome_principal.email}</p>
        </div>
        {centre.description && (
          <div className="card p-4 sm:col-span-2">
            <p className="text-xs uppercase text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-700">{centre.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
