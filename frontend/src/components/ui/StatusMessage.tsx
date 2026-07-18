import Link from "next/link";

export function LoadingMessage() {
  return (
    <div className="space-y-3 py-4" aria-label="Chargement">
      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
      {message}
    </p>
  );
}

export function EmptyMessage({
  message,
  action,
}: {
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-xl">
        📄
      </span>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-1">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
      }`}
    >
      <Dot />
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

export function TypeBadge({ type }: { type: "REVENU" | "DEPENSE" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        type === "REVENU"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-rose-50 text-rose-600"
      }`}
    >
      <Dot />
      {type === "REVENU" ? "Revenu" : "Dépense"}
    </span>
  );
}

export function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
      {children}
    </span>
  );
}
