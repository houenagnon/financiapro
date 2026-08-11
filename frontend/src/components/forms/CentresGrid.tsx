"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api, ApiClientError } from "@/lib/api-client";
import { ErrorMessage } from "@/components/ui/StatusMessage";
import { slugify } from "@/lib/slug";
import type { TypeCentre } from "@/types/centre";

/** Identité par défaut de l'économe créé avec chaque centre — fixe, pour ne
 * rien avoir à saisir. Seul l'email varie (dérivé du nom du centre, pour
 * rester unique) ; prénom/nom et mot de passe sont toujours identiques.
 * Compromis assumé pour la simplicité de la saisie en lot : l'Économat
 * central communique ensuite ces identifiants à chaque économe. */
export const MOT_DE_PASSE_PAR_DEFAUT = "Bienvenue2026!";
export const PRENOM_PAR_DEFAUT = "Économe";
const DOMAINE_EMAIL_PAR_DEFAUT = "financiapro.local";

export function emailParDefaut(nomCentre: string): string {
  const slug = slugify(nomCentre) || "centre";
  return `econome.${slug}@${DOMAINE_EMAIL_PAR_DEFAUT}`;
}

const ligneSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  type_centre_id: z.coerce.number().min(1, "Type requis"),
});

const grilleSchema = z.object({
  lignes: z.array(ligneSchema).min(1, "Ajoutez au moins une ligne."),
});

type GrilleInput = z.input<typeof grilleSchema>;
type GrilleValues = z.output<typeof grilleSchema>;
type LigneInput = GrilleInput["lignes"][number];

function ligneVide(): LigneInput {
  return { nom: "", type_centre_id: "" as unknown as number };
}

const cellInput =
  "w-full border-0 bg-transparent px-3 py-2 text-sm text-slate-800 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 focus:bg-indigo-50";

export function CentresGrid({ typesCentres }: { typesCentres: TypeCentre[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [erreursLignes, setErreursLignes] = useState<Record<number, string>>({});
  const [creees, setCreees] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GrilleInput, unknown, GrilleValues>({
    resolver: zodResolver(grilleSchema),
    defaultValues: { lignes: [ligneVide(), ligneVide()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });
  const lignes = watch("lignes") ?? [];

  const onSubmit = async (values: GrilleValues) => {
    setServerError(null);
    const erreurs: Record<number, string> = {};
    const indexEchecs: number[] = [];
    let ok = 0;

    // Création séquentielle, même logique que la grille de saisie des
    // opérations : les lignes en échec restent affichées avec leur erreur.
    for (let index = 0; index < values.lignes.length; index += 1) {
      const ligne = values.lignes[index];
      try {
        await api("/centres/", {
          method: "POST",
          body: {
            nom: ligne.nom,
            type_centre_id: ligne.type_centre_id,
            description: "",
            econome: {
              first_name: PRENOM_PAR_DEFAUT,
              last_name: ligne.nom,
              email: emailParDefaut(ligne.nom),
              password: MOT_DE_PASSE_PAR_DEFAUT,
            },
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
              : "Erreur de création";
      }
    }

    if (indexEchecs.length === 0) {
      router.replace("/centres");
      return;
    }

    const reussies = values.lignes
      .map((_, index) => index)
      .filter((index) => !indexEchecs.includes(index));
    for (const index of reussies.reverse()) remove(index);

    setCreees(ok);
    setErreursLignes(erreurs);
    setServerError(
      `${indexEchecs.length} ligne(s) en erreur — corrigez-les puis réessayez.`,
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="mb-3 max-w-2xl rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-800">
        Chaque centre reçoit automatiquement un économe par défaut — vous
        n&apos;avez rien à saisir pour lui : identifiant et mot de passe sont
        générés (aperçu dans la dernière colonne), toujours{" "}
        <b className="font-mono font-semibold">{MOT_DE_PASSE_PAR_DEFAUT}</b>{" "}
        pour le mot de passe — à communiquer individuellement.
      </p>

      {creees > 0 && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          {creees} centre(s) créé(s).
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr>
              <th className="w-9 border border-slate-200 bg-slate-100 p-2" />
              {["Nom du centre", "Type de centre", "Économe (généré)"].map((titre) => (
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
              const nom = lignes[index]?.nom ?? "";
              return (
                <tr key={field.id} className="align-top">
                  <td className="border border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-xs text-slate-400">
                    {index + 1}
                  </td>
                  <td className="w-[220px] border border-slate-200">
                    <input
                      type="text"
                      placeholder="Paroisse Saint-Marc"
                      {...register(`lignes.${index}.nom`)}
                      className={cellInput}
                    />
                    {ligneErreurs?.nom && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">{ligneErreurs.nom.message}</p>
                    )}
                  </td>
                  <td className="w-[180px] border border-slate-200">
                    <select {...register(`lignes.${index}.type_centre_id`)} className={cellInput}>
                      <option value="">—</option>
                      {typesCentres.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.libelle}
                        </option>
                      ))}
                    </select>
                    {ligneErreurs?.type_centre_id && (
                      <p className="px-3 pb-1.5 text-xs text-rose-600">
                        {ligneErreurs.type_centre_id.message}
                      </p>
                    )}
                  </td>
                  <td className="border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                    {nom ? (
                      <span className="font-mono text-xs">{emailParDefaut(nom)}</span>
                    ) : (
                      <span className="text-xs italic text-slate-400">
                        saisissez le nom du centre…
                      </span>
                    )}
                    {erreursLignes[index] && (
                      <p className="pt-1.5 text-xs text-rose-600">{erreursLignes[index]}</p>
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
              <td colSpan={5} className="border-t border-slate-200 bg-slate-50 px-3 py-1.5">
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
          {isSubmitting ? "Création…" : `Créer ${fields.length} centre(s)`}
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
