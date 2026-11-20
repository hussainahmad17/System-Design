// Inline SVG icons: no icon library download, ~0.3 KB each.
const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true } as const;

export const BagIcon = () => (
  <svg {...base}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const UserIcon = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const MenuIcon = () => (
  <svg {...base}><path d="M3 7h18M3 12h18M3 17h18" /></svg>
);
export const CloseIcon = () => (
  <svg {...base}><path d="M5 5l14 14M19 5 5 19" /></svg>
);
export const SearchIcon = () => (
  <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
);
export const ChevronIcon = () => (
  <svg {...base} width={16} height={16}><path d="m6 9 6 6 6-6" /></svg>
);
