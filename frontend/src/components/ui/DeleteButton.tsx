"use client";

import { useState } from "react";

import { api, ApiClientError } from "@/lib/api-client";

/** Bouton de suppression réutilisable : confirmation, appel DELETE, et
 * affichage clair si le serveur refuse (enregistrement protégé par des
 * données liées — l'utilisateur est alors invité à désactiver à la place). */
export function DeleteButton({
  path,
  confirmMessage,
  onDeleted,
  label = "Supprimer",
  className = "text-sm text-rose-600 hover:underline",
}: {
  path: string;
  confirmMessage: string;
  onDeleted: () => void;
  label?: string;
  className?: string;
}) {
  const [erreur, setErreur] = useState<string | null>(null);

  const supprimer = async () => {
    if (!window.confirm(confirmMessage)) return;
    setErreur(null);
    try {
      await api(path, { method: "DELETE" });
      onDeleted();
    } catch (error) {
      setErreur(
        error instanceof ApiClientError
          ? error.message
          : "Suppression impossible.",
      );
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={supprimer} className={className}>
        {label}
      </button>
      {erreur && <span className="text-xs text-rose-600">{erreur}</span>}
    </span>
  );
}
