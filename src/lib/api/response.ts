export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string };

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function failure(error: string): ApiFailure {
  return { ok: false, error };
}

// Messages safe to surface verbatim to API callers.
const SAFE_MESSAGE_PREFIXES = [
  "requires Pro",
  "requires Builder",
  "Not authorized",
  "Forbidden",
  "Invalid",
  "Not found",
  "System not found",
  "Access denied",
  "Entitlement",
];

function isSafeMessage(msg: string): boolean {
  return SAFE_MESSAGE_PREFIXES.some((prefix) => msg.startsWith(prefix));
}

export function safeFailure(error: unknown, fallback = "An unexpected error occurred"): ApiFailure {
  const msg = error instanceof Error ? error.message : String(error);
  return failure(isSafeMessage(msg) ? msg : fallback);
}
