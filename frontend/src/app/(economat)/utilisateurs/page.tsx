"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  ActiveBadge,
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api-client";
import { useAuth } from "@/stores/auth-store";
import type { Paginated } from "@/types/api";
import type { User } from "@/types/auth";

const ROLE_LABELS: Record<string, string> = {
  ECONOMAT_CENTRAL: "Économat central",
  ECONOME_PRINCIPAL: "Économe principal",
  ASSISTANT: "Assistant",
};

export default function UtilisateursPage() {
  const { user: moi } = useAuth();
  const { data, loading, error, reload } = useApi<Paginated<User>>("/users/");

  const deactivate = async (user: User) => {
    await api(`/users/${user.id}/deactivate/`, { method: "POST" });
    reload();
  };

  return (
    <div>
      <PageHeader title="Utilisateurs" />
      <p className="mb-4 text-sm text-slate-500">
        Les économes principaux sont créés avec leur centre (page Centres). Les
        assistants sont créés par leur économe. La suppression n&apos;est
        possible que si le compte n&apos;a ni opération ni centre associé —
        sinon, désactivez-le.
      </p>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.results.length === 0 && (
        <EmptyMessage message="Aucun utilisateur." />
      )}
      {data && data.results.length > 0 && (
        <TableCard>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>Email</Th>
              <Th>Rôle</Th>
              <Th>Statut</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data.results.map((user) => (
              <Tr key={user.id}>
                <Td className="font-semibold">
                  {user.first_name} {user.last_name}
                </Td>
                <Td className="text-slate-500">{user.email}</Td>
                <Td>{ROLE_LABELS[user.role]}</Td>
                <Td>
                  <ActiveBadge active={user.is_active} />
                </Td>
                <Td right>
                  {user.id !== moi?.id && (
                    <span className="flex items-center justify-end gap-3">
                      {user.is_active && (
                        <button
                          onClick={() => deactivate(user)}
                          className="text-sm text-amber-700 hover:underline"
                        >
                          Désactiver
                        </button>
                      )}
                      <DeleteButton
                        path={`/users/${user.id}/`}
                        confirmMessage={`Supprimer définitivement ${user.first_name} ${user.last_name} ?`}
                        onDeleted={reload}
                      />
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
