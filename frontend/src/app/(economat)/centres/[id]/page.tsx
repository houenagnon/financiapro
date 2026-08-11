"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  ActiveBadge,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api-client";
import type { Centre } from "@/types/centre";

export default function CentreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: centre, loading, error, reload } = useApi<Centre>(`/centres/${id}/`);
  const [actionError, setActionError] = useState<string | null>(null);

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

  return (
    <div>
      <PageHeader title={centre.nom}>
        <button
          onClick={toggleActive}
          className="btn-ghost px-3 py-1.5"
        >
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
