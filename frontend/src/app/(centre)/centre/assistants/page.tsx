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
import { useAuth } from "@/stores/auth-store";
import type { Paginated } from "@/types/api";
import type { User } from "@/types/auth";

const assistantSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  email: z.email("Adresse email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
});

type AssistantFormValues = z.infer<typeof assistantSchema>;

const inputClass = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function AssistantsPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<Paginated<User>>("/users/");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssistantFormValues>({ resolver: zodResolver(assistantSchema) });

  // Cette page n'est utile qu'à l'Économe principal (le menu la masque aux
  // assistants, l'API refuse de toute façon leurs requêtes).
  const estEconome = user?.role === "ECONOME_PRINCIPAL";
  const assistants = (data?.results ?? []).filter((u) => u.role === "ASSISTANT");

  const onSubmit = async (values: AssistantFormValues) => {
    setServerError(null);
    try {
      await api("/users/", {
        method: "POST",
        body: { ...values, role: "ASSISTANT" },
      });
      reset();
      reload();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Création impossible.");
    }
  };

  const deactivate = async (assistant: User) => {
    await api(`/users/${assistant.id}/deactivate/`, { method: "POST" });
    reload();
  };

  if (!estEconome) {
    return (
      <div>
        <PageHeader title="Assistants" />
        <ErrorMessage message="Seul l'Économe principal peut gérer les assistants." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Assistants" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mb-6 grid max-w-2xl gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
        noValidate
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Prénom
            <input type="text" {...register("first_name")} className={inputClass} />
          </label>
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nom
            <input type="text" {...register("last_name")} className={inputClass} />
          </label>
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Adresse email
            <input type="email" {...register("email")} className={inputClass} />
          </label>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mot de passe initial
            <input type="password" {...register("password")} className={inputClass} />
          </label>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
        {serverError && (
          <div className="sm:col-span-2">
            <ErrorMessage message={serverError} />
          </div>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Création…" : "Créer l'assistant"}
          </button>
        </div>
      </form>

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {!loading && assistants.length === 0 && (
        <EmptyMessage message="Aucun assistant pour le moment." />
      )}
      {assistants.length > 0 && (
        <div className="max-w-2xl overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assistants.map((assistant) => (
                <tr key={assistant.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {assistant.first_name} {assistant.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{assistant.email}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={assistant.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {assistant.is_active && (
                      <button
                        onClick={() => deactivate(assistant)}
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
