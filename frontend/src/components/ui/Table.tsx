import type { ReactNode } from "react";

/** Table du design system : carte blanche, en-têtes discrets, pas de
 * bordures verticales, survol de ligne. */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  right,
  className = "",
}: {
  children?: ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <th
      className={`border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[.07em] text-slate-400 ${
        right ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  className = "",
}: {
  children?: ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-slate-100 px-4 py-3 ${
        right ? "text-right" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="last:[&>td]:border-b-0 hover:bg-slate-50">{children}</tr>;
}
