/** Icônes inline (traits 2px, 24px viewBox) — pas de librairie d'icônes. */
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export type IconName =
  | "dashboard"
  | "list"
  | "calendar"
  | "users"
  | "chart"
  | "building"
  | "tags"
  | "logout";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  list: <path d="M4 6h16M4 12h16M4 18h10" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 2 5-6" />
    </>
  ),
  building: (
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1" />
  ),
  tags: (
    <>
      <path d="M20.59 13.41 12 22l-8-8 8.59-8.59A2 2 0 0 1 14 5h5a2 2 0 0 1 2 2v5a2 2 0 0 1-.41 1.41z" transform="rotate(90 12 12)" />
      <circle cx="15" cy="9" r="1" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-[17px] w-[17px]"} {...base} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
