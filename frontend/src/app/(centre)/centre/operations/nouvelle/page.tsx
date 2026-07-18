"use client";

import { TransactionGrid } from "@/components/forms/TransactionGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { CategoryTree } from "@/types/finance";

export default function NouvelleOperationPage() {
  const { data, loading, error } = useApi<CategoryTree[]>("/categories/tree/");

  return (
    <div>
      <PageHeader title="Saisie des opérations" />
      <p className="mb-4 text-sm text-gray-500">
        Saisissez vos revenus et dépenses ligne par ligne, comme dans un
        tableur, puis enregistrez le tout en une fois.
      </p>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && <TransactionGrid categoriesTree={data} />}
    </div>
  );
}
