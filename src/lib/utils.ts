export function percentChange(initial: number, current: number): number {
  return initial > 0 ? Math.round(((current - initial) / initial) * 100) : 0;
}

/** Zero-pad a number to 2 digits (e.g. 3 → "03") */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format date as locale-aware short date string (vi: dd/MM, en: MM/dd) */
export function formatDateShort(date: Date, locale: "vi" | "en"): string {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  return locale === "vi" ? `${d}/${m}` : `${m}/${d}`;
}

/** Format time as HH:mm */
export function formatTimeShort(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
