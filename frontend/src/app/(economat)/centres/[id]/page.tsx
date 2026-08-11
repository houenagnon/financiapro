"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/ui/PageHeader";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  ActiveBadge,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import type { Paginated } from "@/types/api";
import type { Centre, TypeCentre } from "@/types/centre";

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
        <DeleteButton
          path={`/centres/${id}/`}
          confirmMessage={`Supprimer définitivement le centre « ${centre.nom} » et son économe ?`}
          onDeleted={() => router.replace("/centres")}
          className="btn-ghost border-rose-300 px-3 py-1.5 text-rose-700 hover:bg-rose-50"
          label="Supprimer"
        />
      </PageHeader>

      <p className="mb-4 max-w-2xl text-xs text-slate-400">
        La suppression n&apos;est possible que si le centre n&apos;a aucune
        opération enregistrée — sinon, désactivez-le.
      </p>

      {actionError && <ErrorMessage message={actionError} />}

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
