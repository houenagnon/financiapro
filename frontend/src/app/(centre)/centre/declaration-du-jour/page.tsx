"use client";

import { useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Paginated } from "@/types/api";
import type { DeclarationJournaliere, StatutJour } from "@/types/report";

const STATUT_LABELS: Record<StatutJour, string> = {
  NON_DECLARE: "Non déclaré",
  DECLARE_AVEC_MOUVEMENT: "Déclaré avec mouvement",
  DECLARE_SANS_MOUVEMENT: "Déclaré sans mouvement",
};

function StatutBadge({ statut }: { statut: StatutJour }) {
  const styles: Record<StatutJour, string> = {
    NON_DECLARE: "bg-amber-50 text-amber-600",
    DECLARE_AVEC_MOUVEMENT: "bg-emerald-50 text-emerald-600",
    DECLARE_SANS_MOUVEMENT: "bg-indigo-50 text-indigo-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[statut]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUT_LABELS[statut]}
    </span>
  );
}

interface StatutJourResponse {
  date: string;
  statut: StatutJour;
}

export default function DeclarationDuJourPage() {
  const statutRequest = useApi<StatutJourResponse>("/declarations/statut-jour/");
  const historique = useApi<Paginated<DeclarationJournaliere>>("/declarations/");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const declarerAucuneOperation = async () => {
    setActionError(null);
    setSubmitting(true);
    try {
      await api("/declarations/aucune-operation/", { method: "POST", body: {} });
      statutRequest.reload();
      historique.reload();
    } catch (err) {
      setActionError(
        err instanceof ApiClientError ? err.message : "Déclaration impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statut = statutRequest.data?.statut;

  return (
    <div>
      <PageHeader title="Déclaration du jour" />

      {statutRequest.loading && <LoadingMessage />}
      {statutRequest.error && <ErrorMessage message={statutRequest.error} />}

      {statut && (
        <div className="card mb-6 max-w-xl px-5 py-5">
          <p className="text-xs font-semibold text-slate-500">
            Statut d&apos;aujourd&apos;hui
          </p>
          <p className="mt-2">
            <StatutBadge statut={statut} />
          </p>

          {statut === "NON_DECLARE" && (
            <div className="mt-4">
              <p className="mb-3 text-sm text-slate-600">
                Si aucun mouvement financier n&apos;a eu lieu aujourd&apos;hui,
                déclarez-le explicitement — cela distingue une journée sans
                opération d&apos;un simple oubli.
              </p>
              <button
                onClick={declarerAucuneOperation}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? "Déclaration…" : "Déclarer « aucune opération »"}
              </button>
            </div>
          )}
          {statut === "DECLARE_AVEC_MOUVEMENT" && (
            <p className="mt-3 text-sm text-slate-600">
              Des opérations ont été saisies aujourd&apos;hui : la journée est
              automatiquement déclarée.
            </p>
          )}
          {actionError && (
            <div className="mt-3">
              <ErrorMessage message={actionError} />
            </div>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-900">Historique</h2>
      {historique.loading && <LoadingMessage />}
      {historique.error && <ErrorMessage message={historique.error} />}
      {historique.data && historique.data.results.length === 0 && (
        <EmptyMessage message="Aucune déclaration enregistrée pour le moment." />
      )}
      {historique.data && historique.data.results.length > 0 && (
        <div className="max-w-xl">
          <TableCard>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {historique.data.results.map((declaration) => (
                <Tr key={declaration.id}>
                  <Td className="font-medium">{formatDate(declaration.date)}</Td>
                  <Td>
                    <StatutBadge statut={declaration.statut} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>
        </div>
      )}
    </div>
  );
}
