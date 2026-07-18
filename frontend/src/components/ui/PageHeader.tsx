import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  crumb,
  action,
  children,
}: {
  title: string;
  /** Contexte affiché au-dessus du titre (ex: nom du centre). */
  crumb?: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {crumb && (
          <p className="text-xs font-medium text-slate-400">{crumb}</p>
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2.5">
        {children}
        {action && (
          <Link href={action.href} className="btn-primary">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
