"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { formatDate, formatMontant } from "@/lib/format";
import type { Paginated } from "@/types/api";
import type { Centre } from "@/types/centre";
import type { MouvementTresorerie, SoldeCaisse, TypeMouvement } from "@/types/tresorerie";

const MONTANT_REGEX = /^\d+([.,]\d{1,2})?$/;

const virementSchema = z.object({
  centre: z.coerce.number().min(1, "Centre requis."),
  sens: z.enum(["ENTRANT", "SORTANT"]),
  montant: z.string().refine((v) => MONTANT_REGEX.test(v), "Montant invalide."),
  date_mouvement: z.string().min(1, "Date requise."),
  notes: z.string(),
});
type VirementInput = z.input<typeof virementSchema>;
type VirementValues = z.output<typeof virementSchema>;

const TYPE_LABELS: Record<TypeMouvement, string> = {
  VIREMENT_ENTRANT: "Virement entrant",
  VIREMENT_SORTANT: "Virement sortant",
  ACHAT_PLACEMENT: "Achat de placement",
  RACHAT_PLACEMENT: "Rachat de placement",
};

const ENTRANTS: TypeMouvement[] = ["VIREMENT_ENTRANT", "RACHAT_PLACEMENT"];

function MouvementBadge({ type }: { type: TypeMouvement }) {
  const entrant = ENTRANTS.includes(type);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        entrant ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      }`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

function VirementForm({ centres, onDone }: { centres: Centre[]; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VirementInput, unknown, VirementValues>({
    resolver: zodResolver(virementSchema),
    defaultValues: {
      sens: "ENTRANT",
      date_mouvement: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const onSubmit = async (values: VirementValues) => {
    setServerError(null);
    try {
      await api("/tresorerie/virements/", {
        method: "POST",
        body: { ...values, montant: values.montant.replace(",", ".") },
      });
      reset({
        centre: undefined,
        sens: values.sens,
        montant: "",
        date_mouvement: values.date_mouvement,
        notes: "",
      });
      onDone();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : "Virement impossible.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="card mb-6 grid max-w-3xl gap-3 p-4 sm:grid-cols-2"
      noValidate
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Centre
          <select {...register("centre")} className="input-base mt-1">
            <option value="">—</option>
            {centres.map((centre) => (
              <option key={centre.id} value={centre.id}>
                {centre.nom}
              </option>
            ))}
          </select>
        </label>
        {errors.centre && <p className="mt-1 text-sm text-rose-600">{errors.centre.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Sens
          <select {...register("sens")} className="input-base mt-1">
            <option value="ENTRANT">Le centre alimente la caisse</option>
            <option value="SORTANT">La caisse renvoie des fonds au centre</option>
          </select>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Montant
          <input
            type="text"
            inputMode="decimal"
            placeholder="100000"
            {...register("montant")}
            className="input-base mt-1"
          />
        </label>
        {errors.montant && (
          <p className="mt-1 text-sm text-rose-600">{errors.montant.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Date
          <input type="date" {...register("date_mouvement")} className="input-base mt-1" />
        </label>
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700">
          Notes (facultatif)
          <input type="text" {...register("notes")} className="input-base mt-1" />
        </label>
      </div>

      {serverError && (
        <div className="sm:col-span-2">
          <ErrorMessage message={serverError} />
        </div>
      )}

      <div className="sm:col-span-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Virement…" : "Effectuer le virement"}
        </button>
      </div>
    </form>
  );
}

export default function TresoreriePage() {
  const solde = useApi<SoldeCaisse>("/tresorerie/solde/");
  const mouvements = useApi<Paginated<MouvementTresorerie>>("/tresorerie/mouvements/");
  const centres = useApi<Paginated<Centre>>("/centres/", { is_active: "true" });

  const rafraichir = () => {
    solde.reload();
    mouvements.reload();
  };

  return (
    <div>
      <PageHeader crumb="Économat central" title="Trésorerie centrale" />

      <div className="mb-5 max-w-xs">
        <StatCard label="Solde disponible" value={solde.data?.solde ?? "0"} />
      </div>

      {centres.data && (
        <VirementForm centres={centres.data.results.filter((c) => c.is_active)} onDone={rafraichir} />
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-900">Journal des mouvements</h2>
      {mouvements.loading && <LoadingMessage />}
      {mouvements.error && <ErrorMessage message={mouvements.error} />}
      {mouvements.data && mouvements.data.results.length === 0 && (
        <EmptyMessage message="Aucun mouvement de trésorerie pour le moment." />
      )}
      {mouvements.data && mouvements.data.results.length > 0 && (
        <TableCard>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th right>Montant</Th>
              <Th>Centre</Th>
              <Th>Placement</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {mouvements.data.results.map((mouvement) => (
              <Tr key={mouvement.id}>
                <Td className="text-slate-500">{formatDate(mouvement.date_mouvement)}</Td>
                <Td>
                  <MouvementBadge type={mouvement.type_mouvement} />
                </Td>
                <Td right>{formatMontant(mouvement.montant)}</Td>
                <Td className="text-slate-600">{mouvement.centre ?? "—"}</Td>
                <Td className="text-slate-600">{mouvement.placement ?? "—"}</Td>
                <Td className="text-slate-500">{mouvement.notes || "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
