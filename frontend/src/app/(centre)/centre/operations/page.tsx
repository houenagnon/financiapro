"use client";

import { useState } from "react";

import { RegistreTable } from "@/components/reports/RegistreTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { flattenCategories } from "@/lib/categories";
import type { CategoryTree } from "@/types/finance";
import type { Registre } from "@/types/report";

const inputClass = "input-base w-auto";

export default function OperationsPage() {
  const [filtres, setFiltres] = useState({
    type_operation: "",
    category: "",
    tiers: "",
    date_debut: "",
    date_fin: "",
  });

  const categoriesRequest = useApi<CategoryTree[]>("/categories/tree/");
  const { data, loading, error } = useApi<Registre>("/centre/registre/", {
    type_operation: filtres.type_operation || undefined,
    category: filtres.category || undefined,
    tiers: filtres.tiers || undefined,
    date_debut: filtres.date_debut || undefined,
    date_fin: filtres.date_fin || undefined,
  });

  const categories = flattenCategories(categoriesRequest.data ?? []);

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
          className={inputClass}
        >
          <option value="">Tous les types</option>
          <option value="REVENU">Revenus</option>
          <option value="DEPENSE">Dépenses</option>
        </select>
        <select
          value={filtres.category}
          onChange={(e) => setFiltres({ ...filtres, category: e.target.value })}
          className={inputClass}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filtrer par tiers…"
          value={filtres.tiers}
          onChange={(e) => setFiltres({ ...filtres, tiers: e.target.value })}
          className={inputClass}
        />
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Du
          <input
            type="date"
            value={filtres.date_debut}
            onChange={(e) => setFiltres({ ...filtres, date_debut: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-500">
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
      {data && (
        <RegistreTable
          operations={data.operations}
          soldeInitial={data.solde_initial}
          totaux={data.totaux}
          detailHref={(operation) => `/centre/operations/${operation.id}`}
          messageVide="Aucune opération sur cette période. Saisissez vos premiers revenus et dépenses."
        />
      )}
    </div>
  );
}
