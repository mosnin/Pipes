// Canonical URL helper. Every marketing page declares its canonical URL so
// crawlers do not split signals across query-string variants. Read the base
// from NEXT_PUBLIC_APP_URL when present; otherwise fall back to the
// production hostname.

export const APP_BASE_URL: string =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://pipes.dev";

/**
 * Build an absolute canonical URL from a relative path. Trailing slashes are
 * preserved as-is so callers can model "/foo" vs "/foo/" distinctly when
 * they need to.
 */
export function canonicalUrl(path: string): string {
  const trimmedBase = APP_BASE_URL.replace(/\/+$/, "");
  if (path.length === 0) return `${trimmedBase}/`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${p}`;
}
