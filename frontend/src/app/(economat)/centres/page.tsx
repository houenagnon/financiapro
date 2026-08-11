"use client";

import Link from "next/link";
import { useState } from "react";

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
import type { Centre, TypeCentre } from "@/types/centre";

const inputClass = "input-base w-auto";

export default function CentresPage() {
  const [typeCentre, setTypeCentre] = useState("");
  const [statut, setStatut] = useState("");
  const [recherche, setRecherche] = useState("");

  const types = useApi<Paginated<TypeCentre>>("/types-centres/");
  const { data, loading, error } = useApi<Paginated<Centre>>("/centres/", {
    type_centre: typeCentre || undefined,
    is_active: statut || undefined,
    q: recherche || undefined,
  });

  const filtresActifs = Boolean(typeCentre || statut || recherche);

  return (
    <div>
      <PageHeader
        crumb="Économat central"
        title="Centres"
        action={{ href: "/centres/nouveau", label: "+ Nouveau centre" }}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          placeholder="Rechercher un centre…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className={inputClass}
        />
        <select
          value={typeCentre}
          onChange={(e) => setTypeCentre(e.target.value)}
          className={inputClass}
        >
          <option value="">Tous les types de centre</option>
          {(types.data?.results ?? []).map((type) => (
            <option key={type.id} value={type.id}>
              {type.libelle}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className={inputClass}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.results.length === 0 && filtresActifs && (
        <EmptyMessage message="Aucun centre ne correspond à ces filtres." />
      )}
      {data && data.results.length === 0 && !filtresActifs && (
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
