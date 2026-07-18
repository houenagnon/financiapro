"use client";

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
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <label className="flex items-center gap-2 text-sm text-slate-500">
        Du
        <input
          type="date"
          value={filtres.date_debut}
          onChange={(e) => onChange({ ...filtres, date_debut: e.target.value })}
          className="input-base w-auto"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-500">
        au
        <input
          type="date"
          value={filtres.date_fin}
          onChange={(e) => onChange({ ...filtres, date_fin: e.target.value })}
          className="input-base w-auto"
        />
      </label>
      {children}
    </div>
  );
}
