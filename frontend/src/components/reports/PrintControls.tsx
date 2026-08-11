"use client";

export type PoliceImpression = "sans" | "serif" | "mono";
export type TailleImpression = "sm" | "base" | "lg";

export const POLICES: Record<PoliceImpression, string> = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
};

export const TAILLES: Record<TailleImpression, string> = {
  sm: "12px",
  base: "13.5px",
  lg: "15px",
};

/** Sélection de police/taille pour l'impression + déclenchement de
 * window.print(). La zone visée doit porter la classe `print-area` et
 * recevoir le style { fontFamily, fontSize } calculé par l'appelant. */
export function PrintControls({
  police,
  taille,
  onPoliceChange,
  onTailleChange,
}: {
  police: PoliceImpression;
  taille: TailleImpression;
  onPoliceChange: (police: PoliceImpression) => void;
  onTailleChange: (taille: TailleImpression) => void;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2.5">
      <select
        value={police}
        onChange={(e) => onPoliceChange(e.target.value as PoliceImpression)}
        className="input-base w-auto"
        title="Police d'impression"
      >
        <option value="sans">Sans-serif</option>
        <option value="serif">Serif</option>
        <option value="mono">Monospace</option>
      </select>
      <select
        value={taille}
        onChange={(e) => onTailleChange(e.target.value as TailleImpression)}
        className="input-base w-auto"
        title="Taille du texte"
      >
        <option value="sm">Petit</option>
        <option value="base">Normal</option>
        <option value="lg">Grand</option>
      </select>
      <button type="button" onClick={() => window.print()} className="btn-primary">
        🖶 Imprimer
      </button>
    </div>
  );
}
