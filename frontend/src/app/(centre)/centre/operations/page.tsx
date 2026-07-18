"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
  TypeBadge,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { formatDate, formatMontantSigne } from "@/lib/format";
import type { Paginated } from "@/types/api";
import type { Transaction } from "@/types/finance";

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
        action={{ href: "/centre/operations/nouvelle", label: "+ Saisir des opérations" }}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <select
          value={filtres.type_operation}
          onChange={(e) => setFiltres({ ...filtres, type_operation: e.target.value })}
          className="input-base w-auto"
        >
          <option value="">Tous les types</option>
          <option value="REVENU">Revenus</option>
          <option value="DEPENSE">Dépenses</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Du
          <input
            type="date"
            value={filtres.date_debut}
            onChange={(e) => setFiltres({ ...filtres, date_debut: e.target.value })}
            className="input-base w-auto"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          au
          <input
            type="date"
            value={filtres.date_fin}
            onChange={(e) => setFiltres({ ...filtres, date_fin: e.target.value })}
            className="input-base w-auto"
          />
        </label>
      </div>

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.results.length === 0 && (
        <EmptyMessage
          message="Aucune opération sur cette période. Saisissez vos premiers revenus et dépenses."
          action={{ href: "/centre/operations/nouvelle", label: "Saisir des opérations" }}
        />
      )}
      {data && data.results.length > 0 && (
        <TableCard>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Catégorie</Th>
              <Th>Description</Th>
              <Th right>Montant</Th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((transaction) => (
              <Tr key={transaction.id}>
                <Td>
                  <Link
                    href={`/centre/operations/${transaction.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {formatDate(transaction.date_operation)}
                  </Link>
                </Td>
                <Td>
                  <TypeBadge type={transaction.type_operation} />
                </Td>
                <Td className="text-slate-600">{transaction.category_detail.nom}</Td>
                <Td className="max-w-[240px] truncate text-slate-400">
                  {transaction.description || "—"}
                </Td>
                <Td
                  right
                  className={`font-bold tabular-nums ${
                    transaction.type_operation === "REVENU"
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {formatMontantSigne(transaction.montant, transaction.type_operation)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
