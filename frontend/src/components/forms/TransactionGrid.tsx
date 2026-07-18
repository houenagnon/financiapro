"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api, ApiClientError } from "@/lib/api-client";
import { formatMontant } from "@/lib/format";
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

/** Somme d'affichage des montants saisis (indicatif uniquement — la
 * précision de référence reste côté serveur en Decimal). */
function totalSaisi(lignes: GrilleInput["lignes"], nature: Nature): number {
  return lignes
    .filter((l) => l?.type_operation === nature)
    .reduce((somme, l) => {
      const montant = Number(String(l?.montant ?? "").replace(",", "."));
      return somme + (Number.isNaN(montant) ? 0 : montant);
    }, 0);
}

const cellInput =
  "w-full border-0 bg-transparent px-3 py-2 text-sm text-slate-800 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 focus:bg-indigo-50";

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
  const totalRevenus = totalSaisi(lignes ?? [], "REVENU");
  const totalDepenses = totalSaisi(lignes ?? [], "DEPENSE");

  const optionsPour = (nature: Nature) =>
    categoriesTree
      .filter((c) => c.nature === nature)
      .flatMap((racine) => [
        { id: racine.id, label: racine.nom },
        ...racine.sous_categories.map((sous) => ({
          id: sous.id,
          label: `${racine.nom} › ${sous.nom}`,
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
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          {enregistrees} opération(s) enregistrée(s).
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className="w-9 border border-slate-200 bg-slate-100 p-2" />
              {["Date", "Type", "Catégorie", "Montant", "Description"].map(
                (titre) => (
                  <th
                    key={titre}
                    className="border border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[.07em] text-slate-500"
                  >
                    {titre}
                  </th>
                ),
              )}
              <th className="w-10 border border-slate-200 bg-slate-100 p-2" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const nature = (lignes?.[index]?.type_operation ?? "REVENU") as Nature;
              const ligneErreurs = errors.lignes?.[index];
              return (
                <tr key={field.id} className="align-top">
                  <td className="border border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-xs text-slate-400">
                    {index + 1}
                  </td>
                  <td className="w-[140px] border border-slate-200">
                    <input
                      type="date"
                      {...register(`lignes.${index}.date_operation`)}
                      className={cellInput}
                    />
                  </td>
                  <td className="w-[120px] border border-slate-200">
                    <select
                      {...register(`lignes.${index}.type_operation`)}
                      className={`${cellInput} font-semibold ${
                        nature === "REVENU" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      <option value="REVENU">Revenu</option>
                      <option value="DEPENSE">Dépense</option>
                    </select>
                  </td>
                  <td className="w-[230px] border border-slate-200">
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
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {ligneErreurs.category.message}
                      </p>
                    )}
                  </td>
                  <td className="w-[130px] border border-slate-200">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      {...register(`lignes.${index}.montant`)}
                      className={`${cellInput} text-right tabular-nums`}
                    />
                    {ligneErreurs?.montant && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {ligneErreurs.montant.message}
                      </p>
                    )}
                  </td>
                  <td className="border border-slate-200">
                    <input
                      type="text"
                      placeholder="Facultatif"
                      {...register(`lignes.${index}.description`)}
                      className={cellInput}
                    />
                    {erreursLignes[index] && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {erreursLignes[index]}
                      </p>
                    )}
                  </td>
                  <td className="border border-slate-200 bg-slate-100 px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      title="Supprimer la ligne"
                      className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={4}
                className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-[13px] text-slate-500"
              >
                Totaux saisis
              </td>
              <td className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-[13px] font-bold tabular-nums">
                <span className="text-emerald-600">+{formatMontant(totalRevenus)}</span>
                {" · "}
                <span className="text-rose-600">−{formatMontant(totalDepenses)}</span>
              </td>
              <td colSpan={2} className="border-t border-slate-200 bg-slate-50 px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => append(ligneVide())}
                  className="btn-ghost px-3 py-1 text-[13px]"
                >
                  + Ajouter une ligne
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting
            ? "Enregistrement…"
            : `Enregistrer ${fields.length} ligne(s)`}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">
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
