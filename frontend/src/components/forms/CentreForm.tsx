"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api, ApiClientError } from "@/lib/api-client";
import { ErrorMessage } from "@/components/ui/StatusMessage";
import type { Centre, TypeCentre } from "@/types/centre";

const centreSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  type_centre_id: z.coerce.number().min(1, "Le type de centre est requis."),
  description: z.string(),
  econome: z.object({
    first_name: z.string().min(1, "Le prénom est requis."),
    last_name: z.string().min(1, "Le nom est requis."),
    email: z.email("Adresse email invalide."),
    password: z.string().min(8, "8 caractères minimum."),
  }),
});

type CentreFormInput = z.input<typeof centreSchema>;
type CentreFormValues = z.output<typeof centreSchema>;

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {children}
      </label>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function CentreForm({ typesCentres }: { typesCentres: TypeCentre[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CentreFormInput, unknown, CentreFormValues>({
    resolver: zodResolver(centreSchema),
    defaultValues: { description: "" },
  });

  const onSubmit = async (values: CentreFormValues) => {
    setServerError(null);
    try {
      const centre = await api<Centre>("/centres/", { method: "POST", body: values });
      router.replace(`/centres/${centre.id}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.error.fields) {
        setServerError(JSON.stringify(error.error.fields));
      } else {
        setServerError(error instanceof Error ? error.message : "Création impossible.");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl space-y-6"
      noValidate
    >
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-medium text-gray-900">Le centre</h2>
        <div className="space-y-4">
          <Field label="Nom du centre" error={errors.nom?.message}>
            <input type="text" {...register("nom")} className={inputClass} />
          </Field>
          <Field label="Type de centre" error={errors.type_centre_id?.message}>
            <select {...register("type_centre_id")} className={inputClass}>
              <option value="">— Choisir un type —</option>
              {typesCentres.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.libelle}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description (facultatif)" error={errors.description?.message}>
            <textarea rows={3} {...register("description")} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-medium text-gray-900">
          L&apos;économe principal
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Ce compte est créé en même temps que le centre et en devient responsable.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" error={errors.econome?.first_name?.message}>
            <input type="text" {...register("econome.first_name")} className={inputClass} />
          </Field>
          <Field label="Nom" error={errors.econome?.last_name?.message}>
            <input type="text" {...register("econome.last_name")} className={inputClass} />
          </Field>
          <Field label="Adresse email" error={errors.econome?.email?.message}>
            <input type="email" {...register("econome.email")} className={inputClass} />
          </Field>
          <Field label="Mot de passe initial" error={errors.econome?.password?.message}>
            <input type="password" {...register("econome.password")} className={inputClass} />
          </Field>
        </div>
      </section>

      {serverError && <ErrorMessage message={serverError} />}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Création…" : "Créer le centre"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
