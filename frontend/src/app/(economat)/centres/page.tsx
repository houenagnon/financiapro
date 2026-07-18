"use client";

import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import {
  ActiveBadge,
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import type { Paginated } from "@/types/api";
import type { Centre } from "@/types/centre";

export default function CentresPage() {
  const { data, loading, error } = useApi<Paginated<Centre>>("/centres/");

  return (
    <div>
      <PageHeader
        title="Centres"
        action={{ href: "/centres/nouveau", label: "Nouveau centre" }}
      />
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.results.length === 0 && (
        <EmptyMessage message="Aucun centre pour le moment." />
      )}
      {data && data.results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Économe principal</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((centre) => (
                <tr key={centre.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/centres/${centre.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {centre.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{centre.type_centre.libelle}</td>
                  <td className="px-4 py-3">
                    {centre.econome_principal.first_name}{" "}
                    {centre.econome_principal.last_name}
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={centre.is_active} />
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
