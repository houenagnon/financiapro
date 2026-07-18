"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { Paginated } from "@/types/api";
import type { Transaction } from "@/types/finance";

const inputClass = "rounded-md border border-gray-300 px-3 py-1.5 text-sm";

export default function OperationsPage() {
  const [filtres, setFiltres] = useState({
    type_operation: "",
    date_debut: "",
    date_fin: "",
  });
  const { data, loading, error } = useApi<Paginated<Transaction>>("/transactions/", {
    type_operation: filtres.type_operation || undefined,
    date_debut: filtres.date_debut || undefined,
    date_fin: filtres.date_fin || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Opérations"
        action={{ href: "/centre/operations/nouvelle", label: "Nouvelle opération" }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filtres.type_operation}
          onChange={(e) => setFiltres({ ...filtres, type_operation: e.target.value })}
          className={inputClass}
        >
          <option value="">Tous les types</option>
          <option value="REVENU">Revenus</option>
          <option value="DEPENSE">Dépenses</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Du
          <input
            type="date"
            value={filtres.date_debut}
            onChange={(e) => setFiltres({ ...filtres, date_debut: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          au
          <input
            type="date"
            value={filtres.date_fin}
            onChange={(e) => setFiltres({ ...filtres, date_fin: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.results.length === 0 && (
        <EmptyMessage message="Aucune opération sur cette période." />
      )}
      {data && data.results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/centre/operations/${transaction.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {transaction.date_operation}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        transaction.type_operation === "REVENU"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type_operation === "REVENU" ? "Revenu" : "Dépense"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {transaction.category_detail.nom}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {transaction.montant}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
