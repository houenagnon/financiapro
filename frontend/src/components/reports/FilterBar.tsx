"use client";

const inputClass = "rounded-md border border-gray-300 px-3 py-1.5 text-sm";

export interface PeriodeFiltres {
  date_debut: string;
  date_fin: string;
}

export function FilterBar({
  filtres,
  onChange,
  children,
}: {
  filtres: PeriodeFiltres;
  onChange: (filtres: PeriodeFiltres) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-gray-600">
        Du
        <input
          type="date"
          value={filtres.date_debut}
          onChange={(e) => onChange({ ...filtres, date_debut: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        au
        <input
          type="date"
          value={filtres.date_fin}
          onChange={(e) => onChange({ ...filtres, date_fin: e.target.value })}
          className={inputClass}
        />
      </label>
      {children}
    </div>
  );
}

export function TotalsRow({ totaux }: { totaux: { revenus: string; depenses: string; solde: string } }) {
  const cards = [
    { label: "Revenus", value: totaux.revenus, tone: "text-green-700" },
    { label: "Dépenses", value: totaux.depenses, tone: "text-red-700" },
    { label: "Solde", value: totaux.solde, tone: "text-gray-900" },
  ];
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${card.tone}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
