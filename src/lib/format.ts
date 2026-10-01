const MONTHS_DE = [
  "JAN.",
  "FEB.",
  "MÄRZ",
  "APR.",
  "MAI",
  "JUNI",
  "JULI",
  "AUG.",
  "SEP.",
  "OKT.",
  "NOV.",
  "DEZ.",
];

/** Format ISO date as KanBo-style "19 OKT." */
export function formatBoardDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTHS_DE[d.getMonth()]}`;
}

export function formatBoardRange(
  start: string | null | undefined,
  due: string | null | undefined,
): string | null {
  const a = formatBoardDate(start);
  const b = formatBoardDate(due);
  if (a && b) return `${a} – ${b}`;
  return a ?? b;
}

export function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function avatarHue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 17) % 360;
  return `hsl(${h} 42% 42%)`;
}
