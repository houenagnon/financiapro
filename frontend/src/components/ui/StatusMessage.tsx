export function LoadingMessage() {
  return <p className="py-8 text-center text-sm text-gray-500">Chargement…</p>;
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
  );
}

export function EmptyMessage({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-gray-500">{message}</p>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {active ? "Actif" : "Inactif"}
    </span>
  );
}
