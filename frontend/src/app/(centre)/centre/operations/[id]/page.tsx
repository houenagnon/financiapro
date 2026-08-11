"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { DeleteButton } from "@/components/ui/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorMessage, LoadingMessage } from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { flattenCategories } from "@/lib/categories";
import { formatDate, formatMontant } from "@/lib/format";
import type { CategoryTree } from "@/types/finance";
import type { Transaction } from "@/types/finance";

const MONTANT_REGEX = /^\d+([.,]\d{1,2})?$/;
const champMontant = z
  .string()
  .refine((v) => v === "" || MONTANT_REGEX.test(v), "Montant invalide");

const editSchema = z
  .object({
    date_operation: z.string().min(1, "Date requise"),
    tiers: z.string(),
    category: z.coerce.number().min(1, "Catégorie requise"),
    notes: z.string(),
    montant_depense: champMontant,
    montant_recu: champMontant,
  })
  .refine(
    (v) => (v.montant_depense.trim() !== "") !== (v.montant_recu.trim() !== ""),
    {
      message: "Remplissez soit Dépensé, soit Reçu (un seul des deux).",
      path: ["montant_recu"],
    },
  );

type EditInput = z.input<typeof editSchema>;
type EditValues = z.output<typeof editSchema>;

const inputClass = "input-base mt-1";

function EditForm({
  transaction,
  categoriesTree,
  onSaved,
  onCancel,
}: {
  transaction: Transaction;
  categoriesTree: CategoryTree[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const categories = flattenCategories(categoriesTree);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditInput, unknown, EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      date_operation: transaction.date_operation,
      tiers: transaction.tiers,
      category: transaction.category,
      notes: transaction.notes,
      montant_depense: transaction.type_operation === "DEPENSE" ? transaction.montant : "",
      montant_recu: transaction.type_operation === "REVENU" ? transaction.montant : "",
    },
  });

  const onSubmit = async (values: EditValues) => {
    setServerError(null);
    const estRecu = values.montant_recu.trim() !== "";
    const montant = (estRecu ? values.montant_recu : values.montant_depense).replace(",", ".");
    try {
      await api(`/transactions/${transaction.id}/`, {
        method: "PATCH",
        body: {
          date_operation: values.date_operation,
          tiers: values.tiers,
          category: values.category,
          notes: values.notes,
          type_operation: estRecu ? "REVENU" : "DEPENSE",
          montant,
        },
      });
      onSaved();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Enregistrement impossible.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="card max-w-xl space-y-4 p-5"
      noValidate
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Date de l&apos;opération
          <input type="date" {...register("date_operation")} className={inputClass} />
        </label>
        {errors.date_operation && (
          <p className="mt-1 text-sm text-rose-600">{errors.date_operation.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Tiers
          <input type="text" placeholder="Qui ?" {...register("tiers")} className={inputClass} />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Catégorie
          <select {...register("category")} className={inputClass}>
            <option value="">—</option>
            <optgroup label="Revenus">
              {categories.filter((c) => c.nature === "REVENU").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Dépenses">
              {categories.filter((c) => c.nature === "DEPENSE").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {errors.category && (
          <p className="mt-1 text-sm text-rose-600">{errors.category.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Dépensé
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              {...register("montant_depense")}
              className={`${inputClass} text-right tabular-nums text-rose-700`}
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Reçu
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              {...register("montant_recu")}
              className={`${inputClass} text-right tabular-nums text-emerald-700`}
            />
          </label>
        </div>
      </div>
      {errors.montant_recu && (
        <p className="text-sm text-rose-600">{errors.montant_recu.message}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Notes
          <textarea rows={2} {...register("notes")} className={inputClass} />
        </label>
      </div>

      {serverError && <ErrorMessage message={serverError} />}

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    data: transaction,
    loading,
    error,
    reload,
  } = useApi<Transaction>(`/transactions/${id}/`);
  const categoriesRequest = useApi<CategoryTree[]>("/categories/tree/");
  const [enEdition, setEnEdition] = useState(false);

  if (loading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} />;
  if (!transaction) return null;

  if (enEdition) {
    return (
      <div>
        <PageHeader title="Modifier l'opération" />
        {categoriesRequest.data && (
          <EditForm
            transaction={transaction}
            categoriesTree={categoriesRequest.data}
            onSaved={() => {
              setEnEdition(false);
              reload();
            }}
            onCancel={() => setEnEdition(false)}
          />
        )}
      </div>
    );
  }

  const estRecu = transaction.type_operation === "REVENU";

  return (
    <div>
      <PageHeader title={`Opération du ${formatDate(transaction.date_operation)}`}>
        <button onClick={() => setEnEdition(true)} className="btn-ghost">
          Modifier
        </button>
        <DeleteButton
          path={`/transactions/${id}/`}
          confirmMessage="Supprimer définitivement cette opération ?"
          onDeleted={() => router.replace("/centre/operations")}
          className="btn-ghost border-rose-300 text-rose-700 hover:bg-rose-50"
        />
      </PageHeader>

      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Dépensé</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-rose-600">
            {estRecu ? "—" : formatMontant(transaction.montant)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Reçu</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-600">
            {estRecu ? formatMontant(transaction.montant) : "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Tiers</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {transaction.tiers || "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Catégorie</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {transaction.category_detail.nom}
          </p>
        </div>
        {transaction.notes && (
          <div className="card p-4 sm:col-span-2">
            <p className="text-xs uppercase text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-700">{transaction.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
