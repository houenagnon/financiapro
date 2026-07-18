"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api, ApiClientError } from "@/lib/api-client";
import { ErrorMessage } from "@/components/ui/StatusMessage";
import type { CategoryTree, Nature } from "@/types/finance";

const ligneSchema = z.object({
  date_operation: z.string().min(1, "Date requise"),
  type_operation: z.enum(["REVENU", "DEPENSE"]),
  category: z.coerce.number().min(1, "Catégorie requise"),
  // Le montant reste une string (contrat Decimal côté API) — jamais parseFloat.
  montant: z.string().regex(/^\d+([.,]\d{1,2})?$/, "Montant invalide"),
  description: z.string(),
});

const grilleSchema = z.object({
  lignes: z.array(ligneSchema).min(1, "Ajoutez au moins une ligne."),
});

type GrilleInput = z.input<typeof grilleSchema>;
type GrilleValues = z.output<typeof grilleSchema>;

function ligneVide(): GrilleInput["lignes"][number] {
  return {
    date_operation: new Date().toISOString().slice(0, 10),
    type_operation: "REVENU",
    category: "" as unknown as number,
    montant: "",
    description: "",
  };
}

const cellInput =
  "w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500";

export function TransactionGrid({ categoriesTree }: { categoriesTree: CategoryTree[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [erreursLignes, setErreursLignes] = useState<Record<number, string>>({});
  const [enregistrees, setEnregistrees] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GrilleInput, unknown, GrilleValues>({
    resolver: zodResolver(grilleSchema),
    defaultValues: { lignes: [ligneVide(), ligneVide(), ligneVide()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });

  const lignes = watch("lignes");

  const optionsPour = (nature: Nature) =>
    categoriesTree
      .filter((c) => c.nature === nature)
      .flatMap((racine) => [
        { id: racine.id, label: racine.nom },
        ...racine.sous_categories.map((sous) => ({
          id: sous.id,
          label: `${racine.nom} > ${sous.nom}`,
        })),
      ]);

  const onSubmit = async (values: GrilleValues) => {
    setServerError(null);
    const erreurs: Record<number, string> = {};
    const indexEchecs: number[] = [];
    let ok = 0;

    // Enregistrement séquentiel : les lignes en erreur restent dans la grille
    // avec leur message, les autres sont retirées.
    for (let index = 0; index < values.lignes.length; index += 1) {
      const ligne = values.lignes[index];
      try {
        await api("/transactions/", {
          method: "POST",
          body: { ...ligne, montant: ligne.montant.replace(",", ".") },
        });
        ok += 1;
      } catch (error) {
        indexEchecs.push(index);
        erreurs[indexEchecs.length - 1] =
          error instanceof ApiClientError && error.error.fields
            ? Object.values(error.error.fields).flat().join(" ")
            : error instanceof Error
              ? error.message
              : "Erreur d'enregistrement";
      }
    }

    if (indexEchecs.length === 0) {
      router.replace("/centre/operations");
      return;
    }

    // Retire les lignes enregistrées (en partant de la fin pour garder les index valides).
    const reussies = values.lignes
      .map((_, index) => index)
      .filter((index) => !indexEchecs.includes(index));
    for (const index of reussies.reverse()) remove(index);

    setEnregistrees(ok);
    setErreursLignes(erreurs);
    setServerError(
      `${indexEchecs.length} ligne(s) en erreur — corrigez-les puis réessayez.`,
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {enregistrees > 0 && (
        <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {enregistrees} opération(s) enregistrée(s).
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-xs font-medium uppercase text-gray-600">
            <tr className="divide-x divide-gray-300">
              <th className="w-10 px-2 py-2 text-center">#</th>
              <th className="w-36 px-2 py-2">Date</th>
              <th className="w-32 px-2 py-2">Type</th>
              <th className="w-56 px-2 py-2">Catégorie</th>
              <th className="w-32 px-2 py-2">Montant</th>
              <th className="px-2 py-2">Description</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fields.map((field, index) => {
              const nature = (lignes?.[index]?.type_operation ?? "REVENU") as Nature;
              const ligneErreurs = errors.lignes?.[index];
              return (
                <tr key={field.id} className="divide-x divide-gray-200 align-top">
                  <td className="px-2 py-1.5 text-center text-xs text-gray-400">
                    {index + 1}
                  </td>
                  <td>
                    <input
                      type="date"
                      {...register(`lignes.${index}.date_operation`)}
                      className={cellInput}
                    />
                  </td>
                  <td>
                    <select
                      {...register(`lignes.${index}.type_operation`)}
                      className={cellInput}
                    >
                      <option value="REVENU">Revenu</option>
                      <option value="DEPENSE">Dépense</option>
                    </select>
                  </td>
                  <td>
                    <select
                      {...register(`lignes.${index}.category`)}
                      className={cellInput}
                    >
                      <option value="">—</option>
                      {optionsPour(nature).map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {ligneErreurs?.category && (
                      <p className="px-2 pb-1 text-xs text-red-600">
                        {ligneErreurs.category.message}
                      </p>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register(`lignes.${index}.montant`)}
                      className={`${cellInput} text-right tabular-nums`}
                    />
                    {ligneErreurs?.montant && (
                      <p className="px-2 pb-1 text-xs text-red-600">
                        {ligneErreurs.montant.message}
                      </p>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Facultatif"
                      {...register(`lignes.${index}.description`)}
                      className={cellInput}
                    />
                    {erreursLignes[index] && (
                      <p className="px-2 pb-1 text-xs text-red-600">
                        {erreursLignes[index]}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      title="Supprimer la ligne"
                      className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => append(ligneVide())}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          + Ajouter une ligne
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Enregistrement…" : `Enregistrer ${fields.length} ligne(s)`}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>

      {serverError && (
        <div className="mt-3">
          <ErrorMessage message={serverError} />
        </div>
      )}
    </form>
  );
}
