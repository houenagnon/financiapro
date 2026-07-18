"use client";

import { CentreForm } from "@/components/forms/CentreForm";
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
      <PageHeader title="Nouveau centre" />
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && <CentreForm typesCentres={typesActifs} />}
    </div>
  );
}
