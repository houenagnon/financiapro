"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import type { TypeCentre } from "@/types/centre";

const typeSchema = z.object({
  libelle: z.string().min(1, "Le libellé est requis."),
  code: z
    .string()
    .min(1, "Le code est requis.")
    .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement."),
});

type TypeFormValues = z.infer<typeof typeSchema>;

export default function TypesCentresPage() {
  const { data, loading, error, reload } = useApi<Paginated<TypeCentre>>("/types-centres/");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TypeFormValues>({ resolver: zodResolver(typeSchema) });

  const onSubmit = async (values: TypeFormValues) => {
    setServerError(null);
    try {
      await api("/types-centres/", { method: "POST", body: values });
      reset();
      reload();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Création impossible.");
    }
  };

  const toggle = async (type: TypeCentre) => {
    await api(`/types-centres/${type.id}/`, {
      method: "PATCH",
      body: { is_active: !type.is_active },
    });
    reload();
  };

  return (
    <div>
      <PageHeader title="Types de centre" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mb-6 flex max-w-2xl flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
        noValidate
      >
        <div className="min-w-40 flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Libellé
            <input
              type="text"
              placeholder="Paroisse, École…"
              {...register("libelle")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          {errors.libelle && (
            <p className="mt-1 text-sm text-red-600">{errors.libelle.message}</p>
          )}
        </div>
        <div className="min-w-40 flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Code
            <input
              type="text"
              placeholder="paroisse"
              {...register("code")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
          )}
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
      {data && data.results.length === 0 && (
        <EmptyMessage message="Aucun type de centre défini." />
      )}
      {data && data.results.length > 0 && (
        <div className="max-w-2xl overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((type) => (
                <tr key={type.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{type.libelle}</td>
                  <td className="px-4 py-3 text-gray-500">{type.code}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={type.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggle(type)}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {type.is_active ? "Désactiver" : "Réactiver"}
                    </button>
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
