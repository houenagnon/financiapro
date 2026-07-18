"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api-client";
import type { CategoryTree, Nature } from "@/types/finance";

const categorySchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  nature: z.enum(["REVENU", "DEPENSE"]),
  parent: z
    .union([z.literal(""), z.coerce.number()])
    .transform((v) => (v === "" ? null : v)),
});

type CategoryFormValues = z.input<typeof categorySchema>;

function TreeSection({ titre, arbres }: { titre: string; arbres: CategoryTree[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-medium text-gray-900">{titre}</h2>
      {arbres.length === 0 && (
        <p className="text-sm text-gray-500">Aucune catégorie.</p>
      )}
      <ul className="space-y-2">
        {arbres.map((racine) => (
          <li key={racine.id}>
            <span className="text-sm font-medium text-gray-900">{racine.nom}</span>
            {racine.sous_categories.length > 0 && (
              <ul className="ml-4 mt-1 list-disc space-y-1 pl-4">
                {racine.sous_categories.map((sous) => (
                  <li key={sous.id} className="text-sm text-gray-600">
                    {sous.nom}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CategoriesPage() {
  const { data, loading, error, reload } = useApi<CategoryTree[]>("/categories/tree/");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { nature: "REVENU", parent: "" },
  });

  const natureChoisie = watch("nature") as Nature;
  const racinesDeNature = (data ?? []).filter((c) => c.nature === natureChoisie);

  const onSubmit = async (values: CategoryFormValues) => {
    setServerError(null);
    try {
      const parsed = categorySchema.parse(values);
      await api("/categories/", { method: "POST", body: parsed });
      reset({ nature: parsed.nature, parent: "", nom: "" });
      reload();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Création impossible.");
    }
  };

  return (
    <div>
      <PageHeader title="Catégories" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mb-6 flex max-w-3xl flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
        noValidate
      >
        <div className="min-w-40 flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Nom
            <input
              type="text"
              placeholder="Dons, Fonctionnement…"
              {...register("nom")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nature
            <select
              {...register("nature")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="REVENU">Revenu</option>
              <option value="DEPENSE">Dépense</option>
            </select>
          </label>
        </div>
        <div className="min-w-44">
          <label className="block text-sm font-medium text-gray-700">
            Sous-catégorie de (facultatif)
            <select
              {...register("parent")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Catégorie racine —</option>
              {racinesDeNature.map((racine) => (
                <option key={racine.id} value={racine.id}>
                  {racine.nom}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      {serverError && <ErrorMessage message={serverError} />}
      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {data && data.length === 0 && (
        <EmptyMessage message="Aucune catégorie définie. Les centres en ont besoin pour saisir leurs opérations." />
      )}
      {data && data.length > 0 && (
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <TreeSection titre="Revenus" arbres={data.filter((c) => c.nature === "REVENU")} />
          <TreeSection
            titre="Dépenses"
            arbres={data.filter((c) => c.nature === "DEPENSE")}
          />
        </div>
      )}
    </div>
  );
}
