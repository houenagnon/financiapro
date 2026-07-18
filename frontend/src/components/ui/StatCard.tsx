import { formatMontant } from "@/lib/format";

const TONES = {
  revenu: "text-emerald-600",
  depense: "text-rose-600",
  neutre: "text-slate-900",
} as const;

export function StatCard({
  label,
  value,
  tone = "neutre",
  sub,
}: {
  label: string;
  value: string;
  tone?: keyof typeof TONES;
  sub?: string;
}) {
  return (
    <div className="card px-4.5 py-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-[26px] font-bold leading-tight tracking-tight tabular-nums ${TONES[tone]}`}
      >
        {formatMontant(value)}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function StatsRow({
  totaux,
  sub,
}: {
  totaux: { revenus: string; depenses: string; solde: string };
  sub?: string;
}) {
  return (
    <div className="mb-5 grid gap-3.5 sm:grid-cols-3">
      <StatCard label="Revenus" value={totaux.revenus} tone="revenu" sub={sub} />
      <StatCard label="Dépenses" value={totaux.depenses} tone="depense" sub={sub} />
      <StatCard label="Solde" value={totaux.solde} sub={sub} />
    </div>
  );
}
