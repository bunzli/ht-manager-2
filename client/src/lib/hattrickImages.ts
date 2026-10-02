/** CHPP image paths are relative to Hattrick, not to this application. */
export function hattrickImageUrl(path: string): string {
  return new URL(path, "https://www.hattrick.org").href;
}
