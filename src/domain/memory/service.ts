import { localRecall, type RecallPlace, type RecallProvider } from "@/domain/memory/recall";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

/**
 * Workflow memory: short facts a workflow learns while it runs, given back to
 * the next performer of a step. The model comes from temporal knowledge graphs
 * (Graphiti) and agent brains (gbrain), cut down to what Pipes needs:
 *
 * - A fact is one sentence with provenance: which run, step and actor taught it.
 * - Facts are never edited or deleted. A newer fact with the same `key`
 *   replaces the old one, and forgetting marks a fact invalid; both stay in
 *   the history with when and why.
 * - Facts belong to one workflow, or to the whole workspace.
 *
 * See docs/memory.md.
 */

export const MEMORY_KIND = "memory_fact";
export const WORKSPACE_SCOPE = "workspace";
export const MAX_FACT_LENGTH = 500;
export const MAX_FACTS_PER_SCOPE = 500;
export const STEP_MEMORY_LIMIT = 5;

export type MemorySource = {
  type: "run" | "person" | "agent";
  actorId: string;
  label?: string;
  runId?: string;
  nodeId?: string;
  stepTitle?: string;
};

/** private: one person's own; team: everyone in the workspace; workflow: one workflow's performers. */
export type MemoryScope = "private" | "team" | "workflow";

export type MemoryFact = {
  id: string;
  workspaceId: string;
  /** The workflow this fact belongs to; absent for team and private facts. */
  systemId?: string;
  /** The only person who can see this fact. Present means private. */
  ownerId?: string;
  text: string;
  /** Facts with the same key in the same scope replace each other. */
  key?: string;
  source: MemorySource;
  validAt: string;
  invalidAt?: string;
  invalidReason?: string;
  supersedes?: string;
  supersededBy?: string;
};

export class MemoryError extends Error {
  constructor(
    public code: "bad_request" | "not_found" | "memory_full" | "looks_secret" | "not_allowed",
    message: string
  ) {
    super(message);
  }
}

/** Patterns that look like credentials. Memory is read by every performer, so these never go in. */
const SECRET_PATTERNS = [/\bsk-[A-Za-z0-9_-]{16,}/, /\bgh[pousr]_[A-Za-z0-9]{20,}/, /\bxox[abpr]-[A-Za-z0-9-]{10,}/, /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bbearer\s+[A-Za-z0-9._-]{20,}/i, /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./];

export function looksSecret(text: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(text));
}

const STOP = new Set("a an and are as at be by for from has have i in is it its of on or that the this to was were will with you your we our not no do does".split(" "));

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Rank facts against a query: shared words weighted by how rare they are
 * across the candidate facts (an inverse document frequency), plus a small
 * bonus for newer facts. No query ranks by newest first.
 */
export function rank(facts: MemoryFact[], query: string | undefined, limit: number): Array<MemoryFact & { score: number }> {
  const newest = (a: MemoryFact, b: MemoryFact) => b.validAt.localeCompare(a.validAt);
  const q = query ? [...new Set(tokens(query))] : [];
  if (q.length === 0) return [...facts].sort(newest).slice(0, limit).map((f) => ({ ...f, score: 0 }));
  const docs = facts.map((f) => new Set(tokens(`${f.text} ${f.key ?? ""}`)));
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d) df.set(t, (df.get(t) ?? 0) + 1);
  const n = facts.length;
  const times = facts.map((f) => Date.parse(f.validAt));
  const min = Math.min(...times);
  const span = Math.max(1, Math.max(...times) - min);
  return facts
    .map((f, i) => {
      let score = 0;
      for (const t of q) if (docs[i].has(t)) score += Math.log(1 + n / (df.get(t) ?? 1));
      return { ...f, score: score > 0 ? score + 0.1 * ((times[i] - min) / span) : 0 };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score || newest(a, b))
    .slice(0, limit);
}

function cleanKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 80);
  return key || undefined;
}

/**
 * Who is asking. Private memories belong to `userId` in `workspaceId` and
 * nobody else: no role, not even the Owner, can read another member's. An
 * agent token acts for the person who made it, and reaches that person's
 * private memories only when granted `memory:private`.
 */
export type MemoryActor = Pick<AppContext, "workspaceId" | "userId" | "actorType" | "capabilities">;

export function canUsePrivate(actor: MemoryActor): boolean {
  return actor.actorType === "user" || Boolean(actor.capabilities?.includes("memory:private"));
}

export function scopeOfFact(f: Pick<MemoryFact, "ownerId" | "systemId">): MemoryScope {
  return f.ownerId ? "private" : f.systemId ? "workflow" : "team";
}

/** Whether the actor may see this fact at all. Anything else answers "not found", so ids reveal nothing. */
export function visibleTo(actor: MemoryActor, f: MemoryFact): boolean {
  if (f.workspaceId !== actor.workspaceId) return false;
  if (f.ownerId) return f.ownerId === actor.userId && canUsePrivate(actor);
  return true;
}

export const OUTBOX_KIND = "memory_outbox";
type OutboxItem = { id: string; op: "index" | "unindex" | "purge"; factId?: string; place?: RecallPlace; attempts: number; lastError?: string; at: string };
/** Facts this new are merged into recall results, since the provider may still be processing them. */
const FRESH_MS = 60_000;

export function createMemoryService(repos: RepositorySet, clock: () => Date = () => new Date(), recall: RecallProvider = localRecall) {
  /** Keep the provider in step. A failure never fails the write: it is queued and retried by the rails cron. */
  async function sync(op: OutboxItem["op"], target: { fact?: MemoryFact; place?: RecallPlace }) {
    if (recall.name === "local") return;
    try {
      if (op === "index") await recall.index(target.fact!);
      else if (op === "unindex") await recall.unindex(target.fact!);
      else await recall.purge(target.place!);
    } catch (error) {
      const id = `mob_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const item: OutboxItem = { id, op, factId: target.fact?.id, place: target.place, attempts: 1, lastError: (error as Error).message.slice(0, 300), at: clock().toISOString() };
      await repos.documents.put<OutboxItem>({ kind: OUTBOX_KIND, id, workspaceId: target.fact?.workspaceId ?? target.place?.workspaceId ?? "global", refId: "pending", data: item }).catch(() => undefined);
    }
  }

  /** Where a scope's facts are filed. Private facts are filed under their owner, so listing one person's never touches another's. */
  const refFor = (where: { ownerId?: string; systemId?: string }) => (where.ownerId ? `private:${where.ownerId}` : where.systemId ?? WORKSPACE_SCOPE);

  async function inRef(workspaceId: string, where: { ownerId?: string; systemId?: string }): Promise<MemoryFact[]> {
    const docs = await repos.documents.list<MemoryFact>(MEMORY_KIND, { refId: refFor(where) });
    return docs.filter((d) => d.workspaceId === workspaceId).map((d) => d.data);
  }

  async function write(fact: MemoryFact) {
    await repos.documents.put<MemoryFact>({ kind: MEMORY_KIND, id: fact.id, workspaceId: fact.workspaceId, refId: refFor(fact), data: fact });
  }

  /** Resolve a requested scope into where it is filed, from the actor's identity only. */
  function placeFor(actor: MemoryActor, scope: MemoryScope, systemId?: string): { ownerId?: string; systemId?: string } {
    if (scope === "private") {
      if (!canUsePrivate(actor)) throw new MemoryError("not_allowed", "This token cannot use private memory. Grant it memory:private, which lets it read and write only its creator's own private memories.");
      return { ownerId: actor.userId };
    }
    if (scope === "workflow") {
      if (!systemId) throw new MemoryError("bad_request", "A workflow memory needs the workflow.");
      return { systemId };
    }
    return {};
  }

  /** Current facts across the scopes this actor can see: their own private ones, the team's, and the workflow's. */
  async function current(actor: MemoryActor, systemId: string | undefined, scopes: MemoryScope[]): Promise<MemoryFact[]> {
    const wanted = new Set(scopes);
    const lists = await Promise.all([
      wanted.has("private") && canUsePrivate(actor) ? inRef(actor.workspaceId, { ownerId: actor.userId }) : Promise.resolve([]),
      wanted.has("team") ? inRef(actor.workspaceId, {}) : Promise.resolve([]),
      wanted.has("workflow") && systemId ? inRef(actor.workspaceId, { systemId }) : Promise.resolve([])
    ]);
    return lists.flat().filter((f) => !f.invalidAt && visibleTo(actor, f));
  }

  const ALL: MemoryScope[] = ["private", "team", "workflow"];

  /**
   * Search by meaning through the provider, then keep only hits that are in
   * `allowed`: the facts this actor may see, already loaded from Pipes'
   * records. Facts too new for the provider are merged in. With no query, no
   * provider, or a provider failure, rank by shared words instead.
   */
  async function recallSearch(actor: MemoryActor, allowed: MemoryFact[], scopes: MemoryScope[], query: string | undefined, limit: number) {
    if (!query?.trim() || recall.name === "local" || allowed.length === 0) return rank(allowed, query, limit);
    const places: RecallPlace[] = [];
    if (scopes.includes("private") && canUsePrivate(actor)) places.push({ workspaceId: actor.workspaceId, ownerId: actor.userId });
    if (scopes.includes("team") || scopes.includes("workflow")) places.push({ workspaceId: actor.workspaceId });
    try {
      const hits = await recall.search(places, query, limit);
      const byId = new Map(allowed.map((f) => [f.id, f]));
      const found = hits.filter((h) => byId.has(h.factId)).map((h) => ({ ...byId.get(h.factId)!, score: h.score, inferred: h.inferred }));
      const seen = new Set(found.map((f) => f.id));
      const fresh = rank(allowed.filter((f) => !seen.has(f.id) && clock().getTime() - Date.parse(f.validAt) < FRESH_MS), query, limit);
      const merged = [...found, ...fresh].slice(0, limit);
      return merged.length ? merged : rank(allowed, query, limit);
    } catch {
      return rank(allowed, query, limit);
    }
  }

  return {
    /**
     * Store a fact in a scope. The same sentence twice returns the existing
     * fact; a fact with the key of a current one replaces it (the old one
     * stays in history). Without a scope: the workflow's when one is given,
     * otherwise the team's.
     */
    async remember(actor: MemoryActor, input: { scope?: MemoryScope; systemId?: string; text: unknown; key?: unknown; source: MemorySource }): Promise<{ fact: MemoryFact; replaced?: MemoryFact; duplicate: boolean }> {
      const text = typeof input.text === "string" ? input.text.replace(/\s+/g, " ").trim() : "";
      if (!text) throw new MemoryError("bad_request", "A fact needs text.");
      if (text.length > MAX_FACT_LENGTH) throw new MemoryError("bad_request", `Keep a fact under ${MAX_FACT_LENGTH} characters. Store one thing per fact.`);
      if (looksSecret(text)) throw new MemoryError("looks_secret", "That looks like a credential. Keep secrets in a connection instead, where they are encrypted and never shown.");
      const scope = input.scope ?? (input.systemId ? "workflow" : "team");
      const place = placeFor(actor, scope, input.systemId);
      const key = cleanKey(input.key);
      const live = (await inRef(actor.workspaceId, place)).filter((f) => !f.invalidAt);
      const same = live.find((f) => normalize(f.text) === normalize(text));
      if (same) return { fact: same, duplicate: true };
      const previous = key ? live.find((f) => f.key === key) : undefined;
      if (!previous && live.length >= MAX_FACTS_PER_SCOPE) throw new MemoryError("memory_full", `This memory holds ${MAX_FACTS_PER_SCOPE} facts. Forget some, or give related facts a key so newer ones replace older ones.`);
      const now = clock().toISOString();
      const fact: MemoryFact = { id: `mem_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, workspaceId: actor.workspaceId, ...place, text, key, source: input.source, validAt: now, supersedes: previous?.id };
      await write(fact);
      await sync("index", { fact });
      let replaced: MemoryFact | undefined;
      if (previous) {
        replaced = { ...previous, invalidAt: now, invalidReason: "Replaced by a newer fact.", supersededBy: fact.id };
        await write(replaced);
        await sync("unindex", { fact: replaced });
      }
      return { fact, replaced, duplicate: false };
    },

    /** Mark a fact as no longer true. It stays in the history. */
    async forget(actor: MemoryActor, id: string, reason?: string): Promise<MemoryFact> {
      const doc = await repos.documents.get<MemoryFact>(MEMORY_KIND, id);
      if (!doc || !visibleTo(actor, doc.data)) throw new MemoryError("not_found", "No fact with that id.");
      if (doc.data.invalidAt) return doc.data;
      const fact = { ...doc.data, invalidAt: clock().toISOString(), invalidReason: (typeof reason === "string" && reason.trim().slice(0, 200)) || "Forgotten." };
      await write(fact);
      await sync("unindex", { fact });
      return fact;
    },

    async get(actor: MemoryActor, id: string): Promise<MemoryFact | null> {
      const doc = await repos.documents.get<MemoryFact>(MEMORY_KIND, id);
      return doc && visibleTo(actor, doc.data) ? doc.data : null;
    },

    /** Facts that hold now, best match first, across the requested scopes the actor can see. */
    async search(actor: MemoryActor, input: { systemId?: string; query?: string; limit?: number; scopes?: MemoryScope[] }) {
      const limit = Math.min(Math.max(1, Math.floor(input.limit ?? 10)), 50);
      const scopes = input.scopes ?? ALL;
      return recallSearch(actor, await current(actor, input.systemId, scopes), scopes, input.query, limit);
    },

    /** Everything in one scope, history included, newest first. For the memory page. */
    async history(actor: MemoryActor, scope: MemoryScope, systemId?: string): Promise<MemoryFact[]> {
      if (scope === "private" && !canUsePrivate(actor)) return [];
      const place = scope === "private" ? { ownerId: actor.userId } : scope === "workflow" ? { systemId } : {};
      if (scope === "workflow" && !systemId) return [];
      return (await inRef(actor.workspaceId, place)).filter((f) => visibleTo(actor, f)).sort((a, b) => b.validAt.localeCompare(a.validAt));
    },

    /**
     * Erase every private memory this person has in this workspace, history
     * included. Their data, their call: this is a real delete, not a forget.
     */
    async purgePrivate(actor: MemoryActor): Promise<number> {
      if (actor.actorType !== "user") throw new MemoryError("not_allowed", "Only the person themselves can erase their private memories.");
      const mine = await inRef(actor.workspaceId, { ownerId: actor.userId });
      for (const f of mine) await repos.documents.remove(MEMORY_KIND, f.id);
      await sync("purge", { place: { workspaceId: actor.workspaceId, ownerId: actor.userId } });
      return mine.length;
    },

    /** Retry provider writes that failed. Run from the rails cron. Gives up on an item after 10 tries. */
    async flushOutbox(limit = 50): Promise<{ done: number; failed: number }> {
      if (recall.name === "local") return { done: 0, failed: 0 };
      const pending = (await repos.documents.list<OutboxItem>(OUTBOX_KIND, { refId: "pending" })).slice(0, limit);
      let done = 0;
      let failed = 0;
      for (const doc of pending) {
        const item = doc.data;
        try {
          if (item.op === "purge") await recall.purge(item.place!);
          else {
            const fact = item.factId ? (await repos.documents.get<MemoryFact>(MEMORY_KIND, item.factId))?.data : undefined;
            // An erased fact needs no index; a fact forgotten since needs unindexing whatever the queued op said.
            if (fact) await (fact.invalidAt ? recall.unindex(fact) : item.op === "index" ? recall.index(fact) : recall.unindex(fact));
          }
          await repos.documents.remove(OUTBOX_KIND, item.id);
          done++;
        } catch (error) {
          failed++;
          const attempts = item.attempts + 1;
          await repos.documents.put<OutboxItem>({ kind: OUTBOX_KIND, id: item.id, workspaceId: doc.workspaceId, refId: attempts >= 10 ? "dead" : "pending", data: { ...item, attempts, lastError: (error as Error).message.slice(0, 300) } });
        }
      }
      return { done, failed };
    },

    /**
     * What a performer should know for this step: facts matching the step's
     * title and instructions, from the performer's own private memory, the
     * team's and the workflow's. When nothing matches, the newest workflow facts.
     */
    async forStep(actor: MemoryActor, systemId: string, step: { title: string; instructions?: string; doneWhen?: string }) {
      const facts = await current(actor, systemId, ALL);
      if (facts.length === 0) return [];
      const matched = await recallSearch(actor, facts, ALL, [step.title, step.instructions, step.doneWhen].filter(Boolean).join(" "), STEP_MEMORY_LIMIT);
      return matched.length ? matched : rank(facts.filter((f) => f.systemId === systemId), undefined, STEP_MEMORY_LIMIT);
    }
  };
}

export type MemoryService = ReturnType<typeof createMemoryService>;

/** The shape a performer sees: enough to use and cite a fact, nothing internal. */
export function publicFact(f: MemoryFact) {
  return { id: f.id, text: f.text, key: f.key, scope: scopeOfFact(f), learnedAt: f.validAt, from: f.source.stepTitle ? `${f.source.label ?? f.source.type}, ${f.source.stepTitle}` : f.source.label ?? f.source.type, runId: f.source.runId };
}
