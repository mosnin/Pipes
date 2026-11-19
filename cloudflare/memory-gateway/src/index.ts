/**
 * Pipes memory gateway: a Cloudflare Worker between Pipes and Supermemory
 * (docs/memory.md, "Cloudflare").
 *
 * - The Supermemory API key lives here, as a Worker secret, not on Vercel.
 * - Pipes signs every request (HMAC-SHA256 over method, path and a 60 second
 *   expiry) with PIPES_MEMORY_GATEWAY_SECRET. Unsigned, expired or altered
 *   requests are refused.
 * - Only the calls Pipes makes are allowed, and only on namespaces shaped
 *   like Pipes' own for this environment: `pipes:{env}:ws:{id}` and
 *   `pipes:{env}:ws:{id}:u:{id}`.
 * - Every forwarded call is recorded in D1: time, operation, namespace and
 *   status. Never the content or the query.
 */

export interface Env {
  SUPERMEMORY_API_KEY: string;
  PIPES_MEMORY_GATEWAY_SECRET: string;
  /** prod, preview or dev. Namespaces for any other environment are refused. */
  PIPES_ENV: string;
  SUPERMEMORY_ORIGIN?: string;
  AUDIT?: { prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } } };
}

const NAMESPACE = /^pipes:(prod|preview|dev):ws:[A-Za-z0-9_-]{1,40}(?::u:[A-Za-z0-9_-]{1,40})?$/;
const MAX_SKEW_SECONDS = 120;

/** The operations Pipes uses, by method and path shape. Anything else is refused. */
const ROUTES: Array<{ method: string; pattern: RegExp; op: string }> = [
  { method: "POST", pattern: /^\/ns\/([^/]+)\/document$/, op: "add" },
  { method: "DELETE", pattern: /^\/ns\/([^/]+)\/document$/, op: "delete_documents" },
  { method: "PATCH", pattern: /^\/ns\/([^/]+)\/document\/[^/]+$/, op: "update" },
  { method: "POST", pattern: /^\/ns\/([^/]+)\/search$/, op: "search" },
  { method: "DELETE", pattern: /^\/ns\/([^/]+)$/, op: "delete_namespace" }
];

const json = (status: number, error: string, message: string) => new Response(JSON.stringify({ error, message }), { status, headers: { "content-type": "application/json" } });

function base64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handle(request: Request, env: Env, upstream: typeof fetch = fetch, nowSeconds = Math.floor(Date.now() / 1000)): Promise<Response> {
  if (!env.SUPERMEMORY_API_KEY || !env.PIPES_MEMORY_GATEWAY_SECRET || !env.PIPES_ENV) return json(500, "not_configured", "The gateway is missing a secret or PIPES_ENV.");
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // 1. Signature: Bearer pipes.{exp}.{sig}
  const token = request.headers.get("authorization")?.match(/^Bearer pipes\.(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!token) return json(401, "unsigned", "Requests must be signed by Pipes.");
  const exp = Number(token[1]);
  if (exp < nowSeconds || exp > nowSeconds + MAX_SKEW_SECONDS) return json(401, "expired", "The signature has expired.");
  if (!equal(await sign(env.PIPES_MEMORY_GATEWAY_SECRET, `${method}\n${url.pathname}\n${exp}`), token[2])) return json(401, "bad_signature", "The signature does not match.");

  // 2. Allowed operation and namespace.
  const route = ROUTES.find((r) => r.method === method && r.pattern.test(url.pathname));
  if (!route) return json(403, "operation_not_allowed", "Pipes does not use this operation.");
  const namespace = decodeURIComponent(url.pathname.match(route.pattern)![1]);
  const shape = namespace.match(NAMESPACE);
  if (!shape) return json(403, "namespace_not_allowed", "That is not a Pipes memory namespace.");
  if (shape[1] !== env.PIPES_ENV) return json(403, "wrong_environment", `This gateway serves ${env.PIPES_ENV} only.`);

  // 3. Forward with the real key.
  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${env.SUPERMEMORY_API_KEY}`);
  headers.delete("cookie");
  const target = new URL(url.pathname + url.search, env.SUPERMEMORY_ORIGIN ?? "https://api.supermemory.ai");
  const response = await upstream(target, { method, headers, body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer() });

  // 4. Audit: what, where and how it went. Never the content.
  if (env.AUDIT) {
    await env.AUDIT.prepare("INSERT INTO memory_calls (at, op, namespace, private, status) VALUES (?, ?, ?, ?, ?)")
      .bind(new Date(nowSeconds * 1000).toISOString(), route.op, namespace, namespace.includes(":u:") ? 1 : 0, response.status)
      .run()
      .catch(() => undefined);
  }
  return response;
}

export default { fetch: (request: Request, env: Env) => handle(request, env) };
