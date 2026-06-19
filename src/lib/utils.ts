export function percentChange(initial: number, current: number): number {
  return initial > 0 ? Math.round(((current - initial) / initial) * 100) : 0;
}
