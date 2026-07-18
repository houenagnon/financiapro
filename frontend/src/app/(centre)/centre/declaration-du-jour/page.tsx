"use client";

import { useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyMessage,
  ErrorMessage,
  LoadingMessage,
} from "@/components/ui/StatusMessage";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import type { Paginated } from "@/types/api";
import type { DeclarationJournaliere, StatutJour } from "@/types/report";

const STATUT_LABELS: Record<StatutJour, string> = {
  NON_DECLARE: "Non déclaré",
  DECLARE_AVEC_MOUVEMENT: "Déclaré avec mouvement",
  DECLARE_SANS_MOUVEMENT: "Déclaré sans mouvement",
};

function StatutBadge({ statut }: { statut: StatutJour }) {
  const styles: Record<StatutJour, string> = {
    NON_DECLARE: "bg-amber-100 text-amber-800",
    DECLARE_AVEC_MOUVEMENT: "bg-green-100 text-green-800",
    DECLARE_SANS_MOUVEMENT: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[statut]}`}>
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
        <div className="mb-6 max-w-xl rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Statut d&apos;aujourd&apos;hui</p>
          <p className="mt-2">
            <StatutBadge statut={statut} />
          </p>

          {statut === "NON_DECLARE" && (
            <div className="mt-4">
              <p className="mb-3 text-sm text-gray-700">
                Si aucun mouvement financier n&apos;a eu lieu aujourd&apos;hui,
                déclarez-le explicitement — cela distingue une journée sans
                opération d&apos;un simple oubli.
              </p>
              <button
                onClick={declarerAucuneOperation}
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Déclaration…" : "Déclarer « aucune opération »"}
              </button>
            </div>
          )}
          {statut === "DECLARE_AVEC_MOUVEMENT" && (
            <p className="mt-3 text-sm text-gray-600">
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

      <h2 className="mb-3 text-base font-medium text-gray-900">Historique</h2>
      {historique.loading && <LoadingMessage />}
      {historique.error && <ErrorMessage message={historique.error} />}
      {historique.data && historique.data.results.length === 0 && (
        <EmptyMessage message="Aucune déclaration enregistrée." />
      )}
      {historique.data && historique.data.results.length > 0 && (
        <div className="max-w-xl overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historique.data.results.map((declaration) => (
                <tr key={declaration.id}>
                  <td className="px-4 py-3">{declaration.date}</td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={declaration.statut} />
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
