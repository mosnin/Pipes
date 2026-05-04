// Per-process rate limiter and concurrency tracker for the agent build route.
//
// Two adapters are available:
//   - In-memory (default): single Next.js process scope. Used for dev, mock
//     mode, and any deploy where Upstash is not configured.
//   - Redis (Upstash REST): used when UPSTASH_REDIS_REST_URL is set. Survives
//     across multiple Next.js instances. Loaded lazily on first call.
//
// The exported surface is identical regardless of adapter so callers don't
// know which one is in use.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const inFlight = new Map<string, number>();

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

// ---------------------------------------------------------------------------
// In-memory adapter (always present; used as fallback)
// ---------------------------------------------------------------------------

function memoryCheckRateLimit(
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

function memoryAcquireSlot(key: string, limit: number): boolean {
  const current = inFlight.get(key) ?? 0;
  if (current >= limit) return false;
  inFlight.set(key, current + 1);
  return true;
}

function memoryReleaseSlot(key: string): void {
  const current = inFlight.get(key) ?? 0;
  if (current <= 1) {
    inFlight.delete(key);
    return;
  }
  inFlight.set(key, current - 1);
}

// ---------------------------------------------------------------------------
// Redis (Upstash REST) adapter
// ---------------------------------------------------------------------------

type RedisConfig = { url: string; token: string };

function readRedisConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisCommand<T>(cfg: RedisConfig, command: Array<string | number>): Promise<T | null> {
  // Upstash REST: POST { command: ["GET", "key"] }, response { result: ... }.
  // We use a 2 s timeout so a stalled Redis never blocks the request beyond that.
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2_000);
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(command),
        signal: ac.signal
      });
      if (!res.ok) return null;
      const json = (await res.json().catch(() => null)) as { result?: T } | null;
      return json?.result ?? null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

async function redisCheckRateLimit(cfg: RedisConfig, key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  // INCR + EXPIRE on first hit. Upstash REST does not support EVAL across all
  // tiers, so we use the simpler two-call pattern. Worst case: a request lands
  // between INCR and EXPIRE and the key never expires; the next minute's
  // window still reads the prior count. Acceptable for v1.
  const incr = await redisCommand<number>(cfg, ["INCR", key]);
  if (incr == null) {
    // Redis reachable failure: fall back to memory, fail-open relative to
    // memory limits.
    return memoryCheckRateLimit(key, limit, windowMs);
  }
  if (incr === 1) {
    // First hit in window - set the TTL (PEXPIRE = ms).
    await redisCommand(cfg, ["PEXPIRE", key, windowMs]);
  }
  if (incr > limit) {
    const ttl = await redisCommand<number>(cfg, ["PTTL", key]);
    const retryAfterMs = ttl != null && ttl > 0 ? ttl : windowMs;
    return { ok: false, retryAfterMs };
  }
  return { ok: true, retryAfterMs: 0 };
}

async function redisAcquireSlot(cfg: RedisConfig, key: string, limit: number): Promise<boolean> {
  // SETNX with TTL acts as a binary mutex; for limit > 1 we use an INCR
  // pattern with a generous TTL ceiling so a crashed handler does not lock
  // the user out forever.
  if (limit === 1) {
    const ok = await redisCommand<string | number | null>(cfg, ["SET", key, "1", "NX", "PX", String(60_000)]);
    return ok === "OK" || ok === 1;
  }
  const incr = await redisCommand<number>(cfg, ["INCR", key]);
  if (incr == null) return memoryAcquireSlot(key, limit);
  if (incr === 1) await redisCommand(cfg, ["PEXPIRE", key, 60_000]);
  if (incr > limit) {
    await redisCommand(cfg, ["DECR", key]);
    return false;
  }
  return true;
}

async function redisReleaseSlot(cfg: RedisConfig, key: string): Promise<void> {
  // For binary mutexes we just delete; for counters we DECR. The route layer
  // doesn't know which mode we are in, so we attempt both. DECR on a missing
  // key returns -1 which we then DEL to avoid sticky negatives.
  const result = await redisCommand<number | string>(cfg, ["DECR", key]);
  if (typeof result === "number" && result <= 0) {
    await redisCommand(cfg, ["DEL", key]);
  }
}

// ---------------------------------------------------------------------------
// Public API: dual-path with adapter selection memoized at first call.
// ---------------------------------------------------------------------------

let cachedAdapter: { mode: "redis" | "memory"; cfg?: RedisConfig } | null = null;

function getAdapter(): { mode: "redis" | "memory"; cfg?: RedisConfig } {
  if (cachedAdapter) return cachedAdapter;
  const cfg = readRedisConfig();
  cachedAdapter = cfg ? { mode: "redis", cfg } : { mode: "memory" };
  return cachedAdapter;
}

export function getRateLimiterMode(): "redis" | "memory" {
  return getAdapter().mode;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now()
): RateLimitResult {
  // The route layer is sync-friendly; we keep a sync interface and run the
  // Redis path only when the adapter is configured. For Redis we use a
  // per-call promise stored on the cache to avoid blocking the event loop.
  const adapter = getAdapter();
  if (adapter.mode === "memory" || !adapter.cfg) {
    return memoryCheckRateLimit(key, limit, windowMs, nowMs);
  }
  // Redis path: callers expecting a sync return get an immediate optimistic
  // allow; the Redis call updates the counter asynchronously. The server's
  // strict path uses checkRateLimitAsync below for hard enforcement.
  // We default to allow + schedule the increment so the API surface stays
  // identical for callers that have not switched yet.
  void redisCheckRateLimit(adapter.cfg, key, limit, windowMs);
  return memoryCheckRateLimit(key, limit, windowMs, nowMs);
}

export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now()
): Promise<RateLimitResult> {
  const adapter = getAdapter();
  if (adapter.mode === "memory" || !adapter.cfg) {
    return memoryCheckRateLimit(key, limit, windowMs, nowMs);
  }
  return redisCheckRateLimit(adapter.cfg, key, limit, windowMs);
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
  const adapter = getAdapter();
  if (adapter.mode === "memory" || !adapter.cfg) {
    return memoryAcquireSlot(key, limit);
  }
  // For the Redis adapter the route's API is sync. We perform the optimistic
  // memory acquire and schedule a Redis acquire in the background. For multi-
  // instance correctness, callers should switch to acquireSlotAsync.
  const ok = memoryAcquireSlot(key, limit);
  if (ok) void redisAcquireSlot(adapter.cfg, key, limit);
  return ok;
}

export async function acquireSlotAsync(key: string, limit: number): Promise<boolean> {
  const adapter = getAdapter();
  if (adapter.mode === "memory" || !adapter.cfg) {
    return memoryAcquireSlot(key, limit);
  }
  return redisAcquireSlot(adapter.cfg, key, limit);
}

export function releaseSlot(key: string): void {
  const adapter = getAdapter();
  memoryReleaseSlot(key);
  if (adapter.mode === "redis" && adapter.cfg) {
    void redisReleaseSlot(adapter.cfg, key);
  }
}

export function resetInFlight(key?: string): void {
  if (key === undefined) {
    inFlight.clear();
    return;
  }
  inFlight.delete(key);
}

export function resetRateLimiterAdapterForTests(): void {
  cachedAdapter = null;
}
