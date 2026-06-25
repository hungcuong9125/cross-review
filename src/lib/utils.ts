export function percentChange(initial: number, current: number): number {
  return initial > 0 ? Math.round(((current - initial) / initial) * 100) : 0;
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateShort(date: Date, locale: "vi" | "en"): string {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  return locale === "vi" ? `${d}/${m}` : `${m}/${d}`;
}

export function formatTimeShort(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDebugTimestamp(timestamp: string | undefined | null): Date {
  if (timestamp == null) return new Date();
  const n = Number(timestamp);
  if (!isNaN(n) && n > 0) {
    return new Date(n > 1e12 ? n : n * 1000);
  }
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? new Date() : d;
}
