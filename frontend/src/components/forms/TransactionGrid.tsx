"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api, ApiClientError } from "@/lib/api-client";
import { formatMontant } from "@/lib/format";
import { ErrorMessage } from "@/components/ui/StatusMessage";
import type { Category, CategoryTree, Nature } from "@/types/finance";

const NOUVELLE_CATEGORIE = "__new__";
const MONTANT_REGEX = /^\d+([.,]\d{1,2})?$/;

/** Un montant de colonne (Dépensé/Reçu) est vide OU un nombre valide —
 * jamais les deux colonnes remplies, jamais aucune (vérifié par le refine). */
const champMontant = z
  .string()
  .refine((v) => v === "" || MONTANT_REGEX.test(v), "Montant invalide");

const ligneSchema = z
  .object({
    date_operation: z.string().min(1, "Date requise"),
    tiers: z.string(),
    category: z.coerce.number().min(1, "Catégorie requise"),
    notes: z.string(),
    montant_depense: champMontant,
    montant_recu: champMontant,
  })
  .refine(
    (ligne) => {
      const depense = ligne.montant_depense.trim() !== "";
      const recu = ligne.montant_recu.trim() !== "";
      return depense !== recu; // l'un ou l'autre, jamais les deux ni aucun
    },
    {
      message: "Remplissez soit Dépensé, soit Reçu (un seul des deux).",
      path: ["montant_recu"],
    },
  );

const grilleSchema = z.object({
  lignes: z.array(ligneSchema).min(1, "Ajoutez au moins une ligne."),
});

type GrilleInput = z.input<typeof grilleSchema>;
type GrilleValues = z.output<typeof grilleSchema>;
type LigneInput = GrilleInput["lignes"][number];

function ligneVide(): LigneInput {
  return {
    date_operation: new Date().toISOString().slice(0, 10),
    tiers: "",
    category: "" as unknown as number,
    notes: "",
    montant_depense: "",
    montant_recu: "",
  };
}

function versNombre(montant: string): number {
  const valeur = Number(montant.replace(",", "."));
  return Number.isNaN(valeur) ? 0 : valeur;
}

/** Nature dérivée de la colonne actuellement remplie sur la ligne. */
function natureDeLigne(ligne: LigneInput | undefined): Nature {
  return ligne?.montant_recu?.trim() ? "REVENU" : "DEPENSE";
}

const cellInput =
  "w-full border-0 bg-transparent px-3 py-2 text-sm text-slate-800 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 focus:bg-indigo-50";

export function TransactionGrid({
  categoriesTree,
  soldeInitial,
}: {
  categoriesTree: CategoryTree[];
  /** Solde réel actuel du centre — point de départ du solde cumulatif affiché. */
  soldeInitial: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [erreursLignes, setErreursLignes] = useState<Record<number, string>>({});
  const [enregistrees, setEnregistrees] = useState(0);
  // Catalogue local, enrichi par les catégories créées à la volée.
  const [categories, setCategories] = useState(categoriesTree);
  const [creationLigne, setCreationLigne] = useState<number | null>(null);
  const [nouveauNom, setNouveauNom] = useState("");
  const [creationNature, setCreationNature] = useState<Nature>("DEPENSE");
  const [creationErreur, setCreationErreur] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GrilleInput, unknown, GrilleValues>({
    resolver: zodResolver(grilleSchema),
    defaultValues: { lignes: [ligneVide(), ligneVide(), ligneVide()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });

  const lignes = watch("lignes") ?? [];
  const totalDepenses = lignes.reduce(
    (somme, l) => somme + versNombre(l?.montant_depense ?? ""),
    0,
  );
  const totalRecu = lignes.reduce(
    (somme, l) => somme + versNombre(l?.montant_recu ?? ""),
    0,
  );

  // Solde cumulatif affiché ligne par ligne (indicatif — la valeur de
  // référence reste calculée côté serveur une fois les lignes enregistrées).
  let cumul = versNombre(soldeInitial);
  const soldesParLigne = lignes.map((ligne) => {
    cumul += versNombre(ligne?.montant_recu ?? "") - versNombre(ligne?.montant_depense ?? "");
    return cumul;
  });

  const categoriesGroupees = (): { revenus: { id: number; label: string }[]; depenses: { id: number; label: string }[] } => {
    const aplatir = (nature: Nature) =>
      categories
        .filter((c) => c.nature === nature)
        .flatMap((racine) => [
          { id: racine.id, label: racine.nom },
          ...racine.sous_categories.map((sous) => ({
            id: sous.id,
            label: `${racine.nom} › ${sous.nom}`,
          })),
        ]);
    return { revenus: aplatir("REVENU"), depenses: aplatir("DEPENSE") };
  };

  const ouvrirCreationCategorie = (index: number) => {
    setCreationLigne(index);
    setNouveauNom("");
    setCreationNature(natureDeLigne(lignes[index]));
    setCreationErreur(null);
  };

  const creerCategorie = async (index: number) => {
    const nom = nouveauNom.trim();
    if (!nom) return;
    setCreationErreur(null);
    try {
      const creee = await api<Category>("/categories/", {
        method: "POST",
        body: { nom, nature: creationNature },
      });
      setCategories((existantes) => [...existantes, { ...creee, sous_categories: [] }]);
      setValue(`lignes.${index}.category`, creee.id);
      setCreationLigne(null);
      setNouveauNom("");
    } catch (error) {
      setCreationErreur(
        error instanceof ApiClientError && error.error.fields
          ? Object.values(error.error.fields).flat().join(" ")
          : "Création impossible.",
      );
    }
  };

  const onSubmit = async (values: GrilleValues) => {
    setServerError(null);
    const erreurs: Record<number, string> = {};
    const indexEchecs: number[] = [];
    let ok = 0;

    // Enregistrement séquentiel : les lignes en erreur restent dans la grille
    // avec leur message, les autres sont retirées.
    for (let index = 0; index < values.lignes.length; index += 1) {
      const ligne = values.lignes[index];
      const estRecu = ligne.montant_recu.trim() !== "";
      const type_operation = estRecu ? "REVENU" : "DEPENSE";
      const montant = (estRecu ? ligne.montant_recu : ligne.montant_depense).replace(",", ".");
      try {
        await api("/transactions/", {
          method: "POST",
          body: {
            date_operation: ligne.date_operation,
            tiers: ligne.tiers,
            category: ligne.category,
            notes: ligne.notes,
            type_operation,
            montant,
          },
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

  const { revenus, depenses } = categoriesGroupees();
  const colonnes = ["Date", "Tiers", "Catégorie", "Notes", "Dépensé", "Reçu", "Solde"];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {enregistrees > 0 && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          {enregistrees} opération(s) enregistrée(s).
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr>
              <th className="w-9 border border-slate-200 bg-slate-100 p-2" />
              {colonnes.map((titre) => (
                <th
                  key={titre}
                  className="border border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[.07em] text-slate-500"
                >
                  {titre}
                </th>
              ))}
              <th className="w-10 border border-slate-200 bg-slate-100 p-2" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const ligneErreurs = errors.lignes?.[index];
              return (
                <tr key={field.id} className="align-top">
                  <td className="border border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-xs text-slate-400">
                    {index + 1}
                  </td>
                  <td className="w-[130px] border border-slate-200">
                    <input
                      type="date"
                      {...register(`lignes.${index}.date_operation`)}
                      className={cellInput}
                    />
                  </td>
                  <td className="w-[150px] border border-slate-200">
                    <input
                      type="text"
                      placeholder="Qui ?"
                      {...register(`lignes.${index}.tiers`)}
                      className={cellInput}
                    />
                  </td>
                  <td className="w-[220px] border border-slate-200">
                    {creationLigne === index ? (
                      <div className="space-y-1 p-1.5">
                        <div className="flex gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setCreationNature("DEPENSE")}
                            className={`flex-1 rounded px-1.5 py-1 font-semibold ${
                              creationNature === "DEPENSE"
                                ? "bg-rose-600 text-white"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            Dépense
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreationNature("REVENU")}
                            className={`flex-1 rounded px-1.5 py-1 font-semibold ${
                              creationNature === "REVENU"
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            Revenu
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={nouveauNom}
                            onChange={(e) => setNouveauNom(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                creerCategorie(index);
                              }
                              if (e.key === "Escape") setCreationLigne(null);
                            }}
                            placeholder="Nom de la catégorie"
                            className="input-base flex-1 px-2 py-1 text-[13px]"
                          />
                          <button
                            type="button"
                            onClick={() => creerCategorie(index)}
                            className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreationLigne(null);
                              setNouveauNom("");
                              setCreationErreur(null);
                            }}
                            className="rounded px-1.5 py-1 text-xs text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const champ = register(`lignes.${index}.category`);
                        return (
                          <select
                            {...champ}
                            onChange={(e) => {
                              if (e.target.value === NOUVELLE_CATEGORIE) {
                                ouvrirCreationCategorie(index);
                                return;
                              }
                              champ.onChange(e);
                            }}
                            className={cellInput}
                          >
                            <option value="">—</option>
                            <optgroup label="Revenus">
                              {revenus.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Dépenses">
                              {depenses.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                            <option value={NOUVELLE_CATEGORIE}>
                              ＋ Créer une catégorie…
                            </option>
                          </select>
                        );
                      })()
                    )}
                    {creationLigne === index && creationErreur && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {creationErreur}
                      </p>
                    )}
                    {ligneErreurs?.category && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {ligneErreurs.category.message}
                      </p>
                    )}
                  </td>
                  <td className="w-[180px] border border-slate-200">
                    <input
                      type="text"
                      placeholder="Facultatif"
                      {...register(`lignes.${index}.notes`)}
                      className={cellInput}
                    />
                  </td>
                  <td className="w-[120px] border border-slate-200">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      {...register(`lignes.${index}.montant_depense`)}
                      className={`${cellInput} text-right tabular-nums text-rose-700`}
                    />
                  </td>
                  <td className="w-[120px] border border-slate-200">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      {...register(`lignes.${index}.montant_recu`)}
                      className={`${cellInput} text-right tabular-nums text-emerald-700`}
                    />
                    {ligneErreurs?.montant_recu && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {ligneErreurs.montant_recu.message}
                      </p>
                    )}
                    {erreursLignes[index] && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {erreursLignes[index]}
                      </p>
                    )}
                  </td>
                  <td className="w-[110px] border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-semibold tabular-nums text-slate-700">
                    {formatMontant(soldesParLigne[index] ?? 0)}
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
              <td className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-[13px] font-bold tabular-nums text-rose-600">
                −{formatMontant(totalDepenses)}
              </td>
              <td className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-[13px] font-bold tabular-nums text-emerald-600">
                +{formatMontant(totalRecu)}
              </td>
              <td
                colSpan={2}
                className="border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-right"
              >
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
