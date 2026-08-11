import Link from "next/link";

import { TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { EmptyMessage } from "@/components/ui/StatusMessage";
import { formatDate, formatMontant } from "@/lib/format";
import type { RegistreOperation } from "@/types/report";

/** Table Date/Tiers/Catégorie/Notes/Dépensé/Reçu/Solde partagée entre
 * Opérations et Rapports — même ordre de colonnes partout. */
export function RegistreTable({
  operations,
  soldeInitial,
  totaux,
  detailHref,
  messageVide = "Aucune opération sur cette période.",
}: {
  operations: RegistreOperation[];
  soldeInitial?: string;
  totaux?: { revenus: string; depenses: string; solde: string };
  /** Si fourni, la date de chaque ligne devient un lien vers le détail. */
  detailHref?: (operation: RegistreOperation) => string;
  messageVide?: string;
}) {
  if (operations.length === 0) {
    return <EmptyMessage message={messageVide} />;
  }

  return (
    <TableCard>
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Tiers</Th>
          <Th>Catégorie</Th>
          <Th>Notes</Th>
          <Th right>Dépensé</Th>
          <Th right>Reçu</Th>
          <Th right>Solde</Th>
        </tr>
      </thead>
      <tbody>
        {soldeInitial !== undefined && (
          <Tr>
            <Td colSpan={6} className="text-right italic text-slate-400">
              Solde d&apos;ouverture
            </Td>
            <Td right className="font-semibold tabular-nums text-slate-500">
              {formatMontant(soldeInitial)}
            </Td>
          </Tr>
        )}
        {operations.map((operation) => (
          <Tr key={operation.id}>
            <Td>
              {detailHref ? (
                <Link
                  href={detailHref(operation)}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  {formatDate(operation.date_operation)}
                </Link>
              ) : (
                formatDate(operation.date_operation)
              )}
            </Td>
            <Td className="text-slate-600">{operation.tiers || "—"}</Td>
            <Td className="text-slate-600">{operation.category}</Td>
            <Td className="max-w-[220px] truncate text-slate-400">
              {operation.notes || "—"}
            </Td>
            <Td right className="tabular-nums text-rose-600">
              {operation.type_operation === "DEPENSE" ? formatMontant(operation.montant) : "—"}
            </Td>
            <Td right className="tabular-nums text-emerald-600">
              {operation.type_operation === "REVENU" ? formatMontant(operation.montant) : "—"}
            </Td>
            <Td right className="font-semibold tabular-nums">
              {formatMontant(operation.solde)}
            </Td>
          </Tr>
        ))}
      </tbody>
      {totaux && (
        <tfoot>
          <tr>
            <td colSpan={4} className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-right text-[13px] text-slate-500">
              Totaux de la période
            </td>
            <td className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-rose-600">
              {formatMontant(totaux.depenses)}
            </td>
            <td className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-emerald-600">
              {formatMontant(totaux.revenus)}
            </td>
            <td className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-right text-[13px] font-bold tabular-nums">
              {formatMontant(totaux.solde)}
            </td>
          </tr>
        </tfoot>
      )}
    </TableCard>
  );
}
