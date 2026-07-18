"use client";

import { use, useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
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
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {centre.is_active ? "Désactiver" : "Réactiver"}
        </button>
      </PageHeader>

      {actionError && <ErrorMessage message={actionError} />}

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Type de centre</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {centre.type_centre.libelle}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Statut</p>
          <p className="mt-1">
            <ActiveBadge active={centre.is_active} />
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2">
          <p className="text-xs uppercase text-gray-500">Économe principal</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {centre.econome_principal.first_name} {centre.econome_principal.last_name}
          </p>
          <p className="text-sm text-gray-500">{centre.econome_principal.email}</p>
        </div>
        {centre.description && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2">
            <p className="text-xs uppercase text-gray-500">Description</p>
            <p className="mt-1 text-sm text-gray-700">{centre.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
