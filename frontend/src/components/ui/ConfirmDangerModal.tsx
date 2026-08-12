"use client";

import type { ReactNode } from "react";

/** Modale de confirmation pour une action destructive et irréversible —
 * remplace window.confirm() quand il faut expliquer les conséquences
 * plutôt qu'une simple question oui/non. */
export function ConfirmDangerModal({
  open,
  title,
  children,
  confirmLabel = "Confirmer",
  onConfirm,
  onCancel,
  confirming = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-lg">
            ⚠️
          </span>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>
        <div className="text-sm text-slate-600">{children}</div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {confirming ? "Suppression…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
