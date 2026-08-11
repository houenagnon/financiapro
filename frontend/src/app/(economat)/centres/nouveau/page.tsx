"use client";

import { CentresGrid } from "@/components/forms/CentresGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { Paginated } from "@/types/api";
import type { TypeCentre } from "@/types/centre";

export default function NouveauCentrePage() {
  const { data, loading, error } = useApi<Paginated<TypeCentre>>("/types-centres/");
  const typesActifs = data?.results.filter((t) => t.is_active) ?? [];

  return (
    <div>
      <PageHeader title="Nouveaux centres" />
      <p className="mb-4 text-sm text-slate-500">
        Créez un ou plusieurs centres d&apos;un coup, chacun avec son économe
        principal — comme dans un tableur.
      </p>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && <CentresGrid typesCentres={typesActifs} />}
    </div>
  );
}
