"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import {
  ActiveBadge,
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api-client";
import type { Paginated } from "@/types/api";
import type { User } from "@/types/auth";

const ROLE_LABELS: Record<string, string> = {
  ECONOMAT_CENTRAL: "Économat central",
  ECONOME_PRINCIPAL: "Économe principal",
  ASSISTANT: "Assistant",
};

export default function UtilisateursPage() {
  const { data, loading, error, reload } = useApi<Paginated<User>>("/users/");

  const deactivate = async (user: User) => {
    await api(`/users/${user.id}/deactivate/`, { method: "POST" });
    reload();
  };

  return (
    <div>
      <PageHeader title="Utilisateurs" />
      <p className="mb-4 text-sm text-gray-500">
        Les économes principaux sont créés avec leur centre (page Centres). Les
        assistants sont créés par leur économe.
      </p>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.results.length === 0 && (
        <EmptyMessage message="Aucun utilisateur." />
      )}
      {data && data.results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={user.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.is_active && (
                      <button
                        onClick={() => deactivate(user)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Désactiver
                      </button>
                    )}
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
