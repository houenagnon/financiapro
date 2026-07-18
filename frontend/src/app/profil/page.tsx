"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/stores/auth-store";

const ROLE_LABELS: Record<string, string> = {
  ECONOMAT_CENTRAL: "Économat central",
  ECONOME_PRINCIPAL: "Économe principal",
  ASSISTANT: "Assistant",
};

export default function ProfilPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <PageHeader title="Profil" />
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Nom complet</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {user.first_name} {user.last_name}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-500">Rôle</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {ROLE_LABELS[user.role]}
          </p>
        </div>
        <div className="card p-4 sm:col-span-2">
          <p className="text-xs uppercase text-slate-500">Adresse email</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{user.email}</p>
        </div>
        <p className="text-sm text-slate-500 sm:col-span-2">
          Pour changer votre mot de passe, adressez-vous à votre responsable.
        </p>
      </div>
    </div>
  );
}
