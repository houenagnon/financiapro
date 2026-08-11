"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api-client";
import { formatDate, formatMontant } from "@/lib/format";
import type { Transaction } from "@/types/finance";

export default function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: transaction, loading, error } = useApi<Transaction>(`/transactions/${id}/`);
  const [actionError, setActionError] = useState<string | null>(null);

  const supprimer = async () => {
    if (!window.confirm("Supprimer définitivement cette opération ?")) return;
    setActionError(null);
    try {
      await api(`/transactions/${id}/`, { method: "DELETE" });
      router.replace("/centre/operations");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  if (loading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} />;
  if (!transaction) return null;

  const estRecu = transaction.type_operation === "REVENU";

  return (
    <div>
      <PageHeader title={`Opération du ${formatDate(transaction.date_operation)}`}>
        <button
          onClick={supprimer}
          className="btn-ghost border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          Supprimer
        </button>
      </PageHeader>

      {actionError && <ErrorMessage message={actionError} />}

      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Dépensé</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-rose-600">
            {estRecu ? "—" : formatMontant(transaction.montant)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Reçu</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-600">
            {estRecu ? formatMontant(transaction.montant) : "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Tiers</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {transaction.tiers || "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Catégorie</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {transaction.category_detail.nom}
          </p>
        </div>
        {transaction.notes && (
          <div className="card p-4 sm:col-span-2">
            <p className="text-xs uppercase text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-700">{transaction.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
