import { formatMontant } from "@/lib/format";

/** Mini-barre horizontale proportionnelle (aucune librairie de graphiques).
 * `ratio` entre 0 et 1, calculé par l'appelant sur le max de la série. */
export function BarRow({
  label,
  value,
  ratio,
  tone,
}: {
  label: string;
  value: string;
  ratio: number;
  tone: "revenu" | "depense";
}) {
  const width = `${Math.max(2, Math.round(ratio * 100))}%`;
  return (
    <div className="grid grid-cols-[minmax(90px,130px)_1fr_80px] items-center gap-2.5 text-[13px]">
      <span className="truncate text-slate-600">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full ${
            tone === "revenu" ? "bg-emerald-600" : "bg-rose-600"
          }`}
          style={{ width }}
        />
      </span>
      <span className="text-right font-semibold tabular-nums">
        {formatMontant(value)}
      </span>
    </div>
  );
}
