import { describe, expect, it } from "vitest";
import { handle, type Env } from "../../cloudflare/memory-gateway/src/index";
import { createMemoryService, OUTBOX_KIND } from "@/domain/memory/service";
import { namespaceFor, supermemoryRecall } from "@/domain/memory/recall";
import type { RepositorySet, StoredDocument } from "@/lib/repositories/contracts";

function repos(): RepositorySet & { docs: Map<string, StoredDocument<any>> } {
  const docs = new Map<string, StoredDocument<any>>();
  const k = (kind: string, id: string) => `${kind}/${id}`;
  return {
    docs,
    documents: {
      async get(kind: string, id: string) {
        return docs.get(k(kind, id)) ?? null;
      },
      async put(input: any) {
        docs.set(k(input.kind, input.id), { ...input, createdAt: "", updatedAt: "" });
        return docs.get(k(input.kind, input.id));
      },
      async list(kind: string, f: { workspaceId?: string; refId?: string }) {
        return [...docs.values()].filter((d) => d.kind === kind && (!f.workspaceId || d.workspaceId === f.workspaceId) && (!f.refId || d.refId === f.refId));
      },
      async remove(kind: string, id: string) {
        docs.delete(k(kind, id));
      },
      async commit() {
        return { ok: true };
      }
    }
  } as unknown as RepositorySet & { docs: Map<string, StoredDocument<any>> };
}

/** A stand-in for Supermemory's API: one store per namespace. `leak` makes search ignore namespaces, like a broken provider would. */
function fakeSupermemory(options: { leak?: boolean; down?: boolean } = {}) {
  const store = new Map<string, Array<{ id: string; content: string; metadata: Record<string, unknown> }>>();
  const calls: Array<{ method: string; ns: string; auth: string | null }> = [];
  const state = { ...options };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const parts = url.pathname.split("/").filter(Boolean);
    const ns = decodeURIComponent(parts[1] ?? "");
    calls.push({ method, ns, auth: new Headers(init?.headers).get("authorization") });
    if (state.down) return new Response(JSON.stringify({ error: "down" }), { status: 503, headers: { "content-type": "application/json" } });
    const raw = init?.body instanceof ArrayBuffer || ArrayBuffer.isView(init?.body) ? new TextDecoder().decode(init!.body as ArrayBuffer) : init?.body ? String(init.body) : "";
    const body = raw ? JSON.parse(raw) : {};
    const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
    if (parts[2] === "document" && method === "POST") {
      store.set(ns, [...(store.get(ns) ?? []).filter((d) => d.id !== body.id), { id: body.id, content: body.content, metadata: body.metadata }]);
      return ok({ id: body.id, status: "done" });
    }
    if (parts[2] === "document" && method === "DELETE") {
      store.set(ns, (store.get(ns) ?? []).filter((d) => !body.ids.includes(d.id)));
      return ok({ deleted: body.ids, errors: [] });
    }
    if (parts[2] === "search") {
      const words = String(body.query).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const pool = state.leak ? [...store.values()].flat() : store.get(ns) ?? [];
      const results = pool
        .filter((d) => words.some((w) => d.content.toLowerCase().includes(w)))
        // A leaking provider also lies about the workspace, to test the join rather than the metadata check.
        .map((d) => ({ id: `m_${d.id}`, memory: d.content, metadata: state.leak ? { ...d.metadata, pipesWorkspaceId: ns.split(":")[3] } : d.metadata, similarity: 0.9, isLatest: true, isInference: false, system: { createdAt: "", updatedAt: "" } }));
      return ok({ results, searchTime: 3 });
    }
    if (parts.length === 2 && method === "DELETE") {
      store.delete(ns);
      return ok({ status: "deleted", deletedDocumentsCount: 0, deletedMemoriesCount: 0 });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { fetch: fetchImpl, store, calls, state };
}

const bea = { workspaceId: "w1", userId: "u_bea", actorType: "user" as const };
const cal = { workspaceId: "w1", userId: "u_cal", actorType: "user" as const };
const source = { type: "person" as const, actorId: "x" };

describe("recall namespaces", () => {
  it("gives a namespace per workspace and per person per workspace, and refuses ids that could add a level", () => {
    expect(namespaceFor({ workspaceId: "w1" }, "prod")).toBe("pipes:prod:ws:w1");
    expect(namespaceFor({ workspaceId: "w1", ownerId: "u_bea" }, "prod")).toBe("pipes:prod:ws:w1:u:u_bea");
    expect(() => namespaceFor({ workspaceId: "w1:u:u_bea" })).toThrow();
    expect(() => namespaceFor({ workspaceId: "w1", ownerId: "a:b" })).toThrow();
  });
});

describe("Supermemory recall", () => {
  it("files private facts in the owner's namespace and team facts in the workspace's, with no names in metadata", async () => {
    const sm = fakeSupermemory();
    const m = createMemoryService(repos(), undefined, supermemoryRecall({ apiKey: "sm_test", fetch: sm.fetch, env: "dev" }));
    await m.remember(bea, { scope: "private", text: "I like refund reports sorted by amount.", source: { ...source, label: "Bea Okafor" } });
    await m.remember(bea, { scope: "team", text: "Refund reports go to finance on Fridays.", source });
    expect([...sm.store.keys()].sort()).toEqual(["pipes:dev:ws:w1", "pipes:dev:ws:w1:u:u_bea"]);
    const meta = sm.store.get("pipes:dev:ws:w1:u:u_bea")![0].metadata;
    expect(JSON.stringify(meta)).not.toContain("Bea");
    expect(meta).toMatchObject({ pipesScope: "private", pipesWorkspaceId: "w1" });
    expect(sm.calls.every((c) => c.auth === "Bearer sm_test")).toBe(true);
  });

  it("searches only the caller's own private namespace and the team's", async () => {
    const sm = fakeSupermemory();
    const m = createMemoryService(repos(), undefined, supermemoryRecall({ apiKey: "k", fetch: sm.fetch, env: "dev" }));
    await m.remember(bea, { scope: "private", text: "I like refund reports sorted by amount.", source });
    await m.remember(bea, { scope: "team", text: "Refund reports go to finance on Fridays.", source });
    sm.calls.length = 0;
    const found = await m.search(cal, { query: "refund reports" });
    expect(found.map((f) => f.text)).toEqual(["Refund reports go to finance on Fridays."]);
    expect(sm.calls.filter((c) => c.method === "POST").map((c) => c.ns).sort()).toEqual(["pipes:dev:ws:w1", "pipes:dev:ws:w1:u:u_cal"]);
  });

  it("never shows another person's private fact, even when the provider returns it", async () => {
    const sm = fakeSupermemory();
    const r = repos();
    const m = createMemoryService(r, undefined, supermemoryRecall({ apiKey: "k", fetch: sm.fetch, env: "dev" }));
    await m.remember(bea, { scope: "private", text: "My private refund threshold is $120.", source });
    sm.state.leak = true;
    const found = await m.search(cal, { query: "refund threshold" });
    expect(found.map((f) => f.text)).not.toContain("My private refund threshold is $120.");
  });

  it("keeps working when Supermemory is down, and catches up later", async () => {
    const sm = fakeSupermemory({ down: true });
    const r = repos();
    const m = createMemoryService(r, undefined, supermemoryRecall({ apiKey: "k", fetch: sm.fetch, env: "dev" }));
    const { fact } = await m.remember(bea, { scope: "team", text: "Escalations go to Sam after 6pm.", source });
    expect(fact.id).toBeTruthy();
    expect((await m.search(bea, { query: "escalations after 6pm" })).map((f) => f.text)).toEqual(["Escalations go to Sam after 6pm."]);
    expect([...r.docs.values()].filter((d) => d.kind === OUTBOX_KIND)).toHaveLength(1);
    sm.state.down = false;
    expect(await m.flushOutbox()).toEqual({ done: 1, failed: 0 });
    expect(sm.store.get("pipes:dev:ws:w1")?.map((d) => d.content)).toEqual(["Escalations go to Sam after 6pm."]);
    expect([...r.docs.values()].filter((d) => d.kind === OUTBOX_KIND && d.refId === "pending")).toHaveLength(0);
  });

  it("removes replaced and forgotten facts from the index, and erasing deletes the person's namespace only", async () => {
    const sm = fakeSupermemory();
    const m = createMemoryService(repos(), undefined, supermemoryRecall({ apiKey: "k", fetch: sm.fetch, env: "dev" }));
    await m.remember(bea, { scope: "team", text: "Invoices are sent in dollars.", key: "currency", source });
    await m.remember(bea, { scope: "team", text: "Invoices are sent in euros.", key: "currency", source });
    expect(sm.store.get("pipes:dev:ws:w1")?.map((d) => d.content)).toEqual(["Invoices are sent in euros."]);
    const { fact } = await m.remember(bea, { scope: "private", text: "Remind me to check VAT numbers.", source });
    await m.remember(cal, { scope: "private", text: "Cal checks the bank feed daily.", source });
    await m.forget(bea, fact.id);
    expect(sm.store.get("pipes:dev:ws:w1:u:u_bea")).toEqual([]);
    await m.purgePrivate(bea);
    expect(sm.store.has("pipes:dev:ws:w1:u:u_bea")).toBe(false);
    expect(sm.store.has("pipes:dev:ws:w1:u:u_cal")).toBe(true);
    expect(sm.store.has("pipes:dev:ws:w1")).toBe(true);
  });
});

describe("Cloudflare memory gateway", () => {
  const env: Env = { SUPERMEMORY_API_KEY: "sm_real_key", PIPES_MEMORY_GATEWAY_SECRET: "gateway-secret-for-tests", PIPES_ENV: "dev" };

  /** Pipes' provider talking to the Worker, which talks to the fake Supermemory. */
  function throughGateway() {
    const sm = fakeSupermemory();
    const audit: unknown[][] = [];
    const worker = (async (input: RequestInfo | URL, init?: RequestInit) => handle(new Request(input as URL, init), { ...env, AUDIT: { prepare: () => ({ bind: (...v: unknown[]) => ({ run: async () => audit.push(v) }) }) } }, sm.fetch)) as typeof fetch;
    return { sm, audit, provider: supermemoryRecall({ baseUrl: "https://gateway.example", gatewaySecret: env.PIPES_MEMORY_GATEWAY_SECRET, fetch: worker, env: "dev" }) };
  }

  it("forwards signed Pipes requests with the real key, and audits without content", async () => {
    const { sm, audit, provider } = throughGateway();
    const m = createMemoryService(repos(), undefined, provider);
    await m.remember(bea, { scope: "private", text: "Bea's secret-free preference.", source });
    expect(sm.calls.at(-1)).toMatchObject({ method: "POST", ns: "pipes:dev:ws:w1:u:u_bea", auth: "Bearer sm_real_key" });
    expect(audit[0]).toEqual([expect.any(String), "add", "pipes:dev:ws:w1:u:u_bea", 1, 200]);
    expect(JSON.stringify(audit)).not.toContain("preference");
  });

  it("refuses unsigned, tampered, expired, foreign and other-environment requests", async () => {
    const sm = fakeSupermemory();
    const now = Math.floor(Date.now() / 1000);
    const call = (path: string, auth?: string, method = "POST") => handle(new Request(`https://gateway.example${path}`, { method, headers: auth ? { authorization: auth } : {}, body: "{}" }), env, sm.fetch, now);
    const { gatewayFetch } = await import("@/domain/memory/recall");
    let signed = "";
    await gatewayFetch(env.PIPES_MEMORY_GATEWAY_SECRET, (async (_u: RequestInfo | URL, init?: RequestInit) => {
      signed = new Headers(init?.headers).get("authorization") ?? "";
      return new Response("{}");
    }) as typeof fetch)("https://gateway.example/ns/pipes%3Adev%3Aws%3Aw1/search", { method: "POST" });
    expect((await call("/ns/pipes%3Adev%3Aws%3Aw1/search", signed)).status).toBe(200);
    expect((await call("/ns/pipes%3Adev%3Aws%3Aw1/search")).status).toBe(401);
    // Same signature, different namespace: the path is part of what was signed.
    expect((await call("/ns/pipes%3Adev%3Aws%3Aw2/search", signed)).status).toBe(401);
    expect((await call("/ns/pipes%3Adev%3Aws%3Aw1/search", `Bearer pipes.${now - 5}.abc`)).status).toBe(401);
    const sign = async (path: string, method = "POST") => {
      let h = "";
      await gatewayFetch(env.PIPES_MEMORY_GATEWAY_SECRET, (async (_u: RequestInfo | URL, init?: RequestInit) => {
        h = new Headers(init?.headers).get("authorization") ?? "";
        return new Response("{}");
      }) as typeof fetch)(`https://gateway.example${path}`, { method });
      return h;
    };
    expect((await call("/ns/someone-else/search", await sign("/ns/someone-else/search"))).status).toBe(403);
    expect((await call("/ns/pipes%3Aprod%3Aws%3Aw1/search", await sign("/ns/pipes%3Aprod%3Aws%3Aw1/search"))).status).toBe(403);
    expect((await call("/v3/documents", await sign("/v3/documents"))).status).toBe(403);
    expect(sm.calls).toHaveLength(1);
  });
});
