import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {children}
        {action && (
          <Link
            href={action.href}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
