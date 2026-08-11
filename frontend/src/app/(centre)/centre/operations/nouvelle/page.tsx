"use client";

import { TransactionGrid } from "@/components/forms/TransactionGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { CategoryTree } from "@/types/finance";
import type { CentreDashboard } from "@/types/report";

export default function NouvelleOperationPage() {
  const categoriesRequest = useApi<CategoryTree[]>("/categories/tree/");
  // Le solde actuel du centre sert de point de départ à la colonne Solde.
  const dashboardRequest = useApi<CentreDashboard>("/centre/dashboard/");

  const loading = categoriesRequest.loading || dashboardRequest.loading;
  const error = categoriesRequest.error || dashboardRequest.error;

  return (
    <div>
      <PageHeader title="Saisie des opérations" />
      <p className="mb-4 text-sm text-slate-500">
        Saisissez vos revenus et dépenses ligne par ligne, comme dans un
        tableur, puis enregistrez le tout en une fois.
      </p>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {categoriesRequest.data && dashboardRequest.data && (
        <TransactionGrid
          categoriesTree={categoriesRequest.data}
          soldeInitial={dashboardRequest.data.totaux.solde}
        />
      )}
    </div>
  );
}
