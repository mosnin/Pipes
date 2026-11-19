import crypto from "node:crypto";
import { Supermemory } from "supermemory";
import type { MemoryFact } from "@/domain/memory/service";

/**
 * Recall: how memory is searched by meaning. Pipes' own `memory_fact`
 * records stay the source of truth for every fact, its owner and its
 * history; a recall provider is an index over them (docs/memory.md).
 *
 * - `local` ranks the records themselves by shared words. No network.
 * - `supermemory` sends each fact to Supermemory and searches there.
 *
 * Every hit a provider returns is joined back to the records the caller is
 * allowed to see before anyone sees it, so a provider mistake can never
 * show one person's private memory to another.
 */

export type RecallHit = { factId: string; score: number; inferred?: boolean };

/** Where a fact is filed in the provider: a workspace, and an owner for private facts. */
export type RecallPlace = { workspaceId: string; ownerId?: string };

export interface RecallProvider {
  readonly name: "local" | "supermemory";
  /** Make a stored fact findable. Idempotent per fact. */
  index(fact: MemoryFact): Promise<void>;
  /** Stop a fact being found (replaced or forgotten). Pipes keeps its history. */
  unindex(fact: MemoryFact): Promise<void>;
  /** Hits in the given places, best first. Only called with places the caller may see. */
  search(places: RecallPlace[], query: string, limit: number): Promise<RecallHit[]>;
  /** Delete everything in a place, for good. */
  purge(place: RecallPlace): Promise<void>;
}

/** The local provider: Pipes' records are the index, so writes are no-ops and search falls back to word ranking. */
export const localRecall: RecallProvider = {
  name: "local",
  async index() {},
  async unindex() {},
  async search() {
    return [];
  },
  async purge() {}
};

// --- Supermemory -------------------------------------------------------

const NS_PART = /^[a-zA-Z0-9_-]{1,40}$/;

/** prod, preview or dev, so test data never lands next to real data in the same Supermemory org. */
export function recallEnvironment(): "prod" | "preview" | "dev" {
  return process.env.VERCEL_ENV === "production" ? "prod" : process.env.VERCEL_ENV === "preview" ? "preview" : "dev";
}

/**
 * The namespace for a place. The only code that builds one. Ids are checked
 * so no value can add a level (`:`) or reach another workspace's namespace.
 * Team and workflow facts share the workspace's namespace; private facts get
 * one per person per workspace, so leaving or erasing is one delete.
 */
export function namespaceFor(place: RecallPlace, env = recallEnvironment()): string {
  if (!NS_PART.test(place.workspaceId)) throw new Error("Bad workspace id for a memory namespace.");
  if (place.ownerId !== undefined && !NS_PART.test(place.ownerId)) throw new Error("Bad user id for a memory namespace.");
  const ns = place.ownerId ? `pipes:${env}:ws:${place.workspaceId}:u:${place.ownerId}` : `pipes:${env}:ws:${place.workspaceId}`;
  if (ns.length > 100) throw new Error("Memory namespace too long.");
  return ns;
}

const docId = (factId: string) => `pf_${factId}`;

/**
 * Signs each request for the Cloudflare memory gateway (cloudflare/memory-gateway):
 * the gateway holds the real Supermemory key and only forwards requests whose
 * signature covers the method, path and a short expiry.
 */
export function gatewayFetch(secret: string, inner: typeof fetch = fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const exp = Math.floor(Date.now() / 1000) + 60;
    const sig = crypto.createHmac("sha256", secret).update(`${method}\n${url.pathname}\n${exp}`).digest("base64url");
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("authorization", `Bearer pipes.${exp}.${sig}`);
    return inner(url, { ...init, method, headers });
  }) as typeof fetch;
}

export function supermemoryRecall(options: { apiKey?: string; baseUrl?: string; gatewaySecret?: string; fetch?: typeof fetch; env?: "prod" | "preview" | "dev" }): RecallProvider {
  const viaGateway = Boolean(options.baseUrl && options.gatewaySecret);
  const client = new Supermemory({
    // Behind the gateway the real key lives in Cloudflare; Pipes only signs.
    apiKey: viaGateway ? "gateway" : options.apiKey,
    baseUrl: options.baseUrl,
    fetch: viaGateway ? gatewayFetch(options.gatewaySecret!, options.fetch) : options.fetch,
    timeoutInSeconds: 8,
    maxRetries: 1
  });
  const ns = (place: RecallPlace) => namespaceFor(place, options.env);

  return {
    name: "supermemory",

    async index(fact) {
      await client.add(ns(fact), {
        content: fact.text,
        id: docId(fact.id),
        // Only what recall needs: ids and the key. Never names, emails or run payloads.
        metadata: { pipesFactId: fact.id, pipesWorkspaceId: fact.workspaceId, pipesScope: fact.ownerId ? "private" : fact.systemId ? "workflow" : "team", pipesSystemId: fact.systemId ?? "", pipesKey: fact.key ?? "" },
        supportingContext: "One fact a team's agents learned while following a workflow.",
        date: fact.validAt,
        taskType: "memory",
        // The next step reads memory straight away, so make it available now.
        dreaming: "instant"
      });
    },

    async unindex(fact) {
      const res = (await client.documents.delete(ns(fact), { ids: [docId(fact.id)] })) as { errors?: Array<{ id: string; error: string }> };
      // A document still being processed cannot be deleted yet; the caller queues a retry.
      const failed = res?.errors?.find((e) => !/not found/i.test(e.error));
      if (failed) throw new Error(`Supermemory could not delete ${failed.id}: ${failed.error}`);
    },

    async search(places, query, limit) {
      const lists = await Promise.all(
        places.map(async (place) => {
          const res = await client.search(ns(place), { query, searchMode: "memories", limit, threshold: 0.3, rerank: "none" });
          const hits: RecallHit[] = [];
          for (const r of res.results) {
            const factId = typeof r.metadata?.pipesFactId === "string" ? r.metadata.pipesFactId : undefined;
            // Belt and braces: a hit must carry the workspace it was searched in.
            if (factId && r.metadata?.pipesWorkspaceId === place.workspaceId) hits.push({ factId, score: r.similarity, inferred: r.isInference });
          }
          return hits;
        })
      );
      const best = new Map<string, RecallHit>();
      for (const hit of lists.flat()) if (!best.has(hit.factId) || best.get(hit.factId)!.score < hit.score) best.set(hit.factId, hit);
      return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
    },

    async purge(place) {
      await client.namespaces.delete(ns(place));
    }
  };
}

/** The provider this deployment uses. Local unless Supermemory is configured and chosen. */
export function recallProvider(env: { PIPES_MEMORY_PROVIDER?: string; SUPERMEMORY_API_KEY?: string; SUPERMEMORY_BASE_URL?: string; PIPES_MEMORY_GATEWAY_SECRET?: string; PIPES_USE_MOCKS?: boolean }): RecallProvider {
  if (env.PIPES_USE_MOCKS || env.PIPES_MEMORY_PROVIDER !== "supermemory") return localRecall;
  if (env.SUPERMEMORY_BASE_URL && env.PIPES_MEMORY_GATEWAY_SECRET) return supermemoryRecall({ baseUrl: env.SUPERMEMORY_BASE_URL, gatewaySecret: env.PIPES_MEMORY_GATEWAY_SECRET });
  if (env.SUPERMEMORY_API_KEY) return supermemoryRecall({ apiKey: env.SUPERMEMORY_API_KEY, baseUrl: env.SUPERMEMORY_BASE_URL });
  return localRecall;
}
