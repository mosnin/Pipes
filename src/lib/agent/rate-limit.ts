// Per-process in-memory rate limiter and concurrency tracker for the agent
// build route. Single Next.js server process scope. For multi-instance deploys
// move both `buckets` and `inFlight` into Redis or Upstash; the API of this
// module is intentionally pure-function so swapping the storage is local.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const inFlight = new Map<string, number>();

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now()
): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - nowMs };
  }
  bucket.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

export function resetRateLimit(key?: string): void {
  if (key === undefined) {
    buckets.clear();
    return;
  }
  buckets.delete(key);
}

export function getInFlight(key: string): number {
  return inFlight.get(key) ?? 0;
}

export function acquireSlot(key: string, limit: number): boolean {
  const current = inFlight.get(key) ?? 0;
  if (current >= limit) return false;
  inFlight.set(key, current + 1);
  return true;
}

export function releaseSlot(key: string): void {
  const current = inFlight.get(key) ?? 0;
  if (current <= 1) {
    inFlight.delete(key);
    return;
  }
  inFlight.set(key, current - 1);
}

export function resetInFlight(key?: string): void {
  if (key === undefined) {
    inFlight.clear();
    return;
  }
  inFlight.delete(key);
}
