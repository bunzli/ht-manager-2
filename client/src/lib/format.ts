/** Format a plain number with `.` as the thousands separator. */
export function formatNumber(value: number): string {
  return value.toLocaleString("de-DE");
}

/**
 * Format a monetary value in USD.
 * HT prices are stored in € — multiply by 20 to convert to $.
 */
export function formatMoney(value: number): string {
  return `$${(value * 20).toLocaleString("de-DE")}`;
}
