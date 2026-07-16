import { ONE_WEEK_MS } from "./constants";

export interface TsiVariations {
  tsiVariationWeek: number | null;
  tsiVariationMonthPct: number | null;
  tsiVariationQuarterPct: number | null;
}

export function calculateTsiVariations(
  currentTsi: number,
  snapshots: Array<{ fetchedAt: Date; tsi: number }>,
  now = Date.now(),
): TsiVariations {
  const findAtOrBefore = (days: number) =>
    snapshots.find((snapshot) => snapshot.fetchedAt.getTime() <= now - (days * ONE_WEEK_MS) / 7);
  const week = findAtOrBefore(7);
  const month = findAtOrBefore(30);
  const quarter = findAtOrBefore(90);
  const percent = (baseline?: { tsi: number }) =>
    baseline && baseline.tsi !== 0
      ? ((currentTsi - baseline.tsi) / baseline.tsi) * 100
      : null;
  return {
    tsiVariationWeek: week ? currentTsi - week.tsi : null,
    tsiVariationMonthPct: percent(month),
    tsiVariationQuarterPct: percent(quarter),
  };
}
