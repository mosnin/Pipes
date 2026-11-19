/**
 * The sentence to show when an API route says no. Older routes answer
 * `{ ok: false, error: "<sentence>" }`, newer ones `{ ok: false, error: code,
 * message }`. Either way the person sees what the server said, and only a
 * reply with nothing to say falls back to the generic line.
 */
export function apiErrorMessage(json: unknown, fallback: string): string {
  const body = (json ?? {}) as { message?: unknown; error?: unknown };
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  const nested = (body.error as { message?: unknown } | null | undefined)?.message;
  if (typeof nested === "string" && nested.trim()) return nested;
  return fallback;
}
