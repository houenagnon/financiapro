"use client";

import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  ActiveBadge,
  EmptyMessage,
  ErrorMessage,
  InfoBadge,
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
        crumb="Économat central"
        title="Centres"
        action={{ href: "/centres/nouveau", label: "+ Nouveau centre" }}
      />
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.results.length === 0 && (
        <EmptyMessage
          message="Aucun centre pour le moment. Créez votre premier centre et son économe principal."
          action={{ href: "/centres/nouveau", label: "Créer un centre" }}
        />
      )}
      {data && data.results.length > 0 && (
        <TableCard>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>Type</Th>
              <Th>Économe principal</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((centre) => (
              <Tr key={centre.id}>
                <Td>
                  <Link
                    href={`/centres/${centre.id}`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {centre.nom}
                  </Link>
                </Td>
                <Td>
                  <InfoBadge>{centre.type_centre.libelle}</InfoBadge>
                </Td>
                <Td className="text-slate-600">
                  {centre.econome_principal.first_name}{" "}
                  {centre.econome_principal.last_name}
                </Td>
                <Td>
                  <ActiveBadge active={centre.is_active} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
