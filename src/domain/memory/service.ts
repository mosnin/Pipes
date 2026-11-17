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

export type MemoryFact = {
  id: string;
  workspaceId: string;
  /** The workflow this fact belongs to; absent for a workspace-wide fact. */
  systemId?: string;
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
    public code: "bad_request" | "not_found" | "memory_full" | "looks_secret",
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

export function createMemoryService(repos: RepositorySet, clock: () => Date = () => new Date()) {
  const scopeOf = (systemId?: string) => systemId ?? WORKSPACE_SCOPE;

  async function inScope(workspaceId: string, systemId?: string): Promise<MemoryFact[]> {
    const docs = await repos.documents.list<MemoryFact>(MEMORY_KIND, { refId: scopeOf(systemId) });
    return docs.filter((d) => d.workspaceId === workspaceId).map((d) => d.data);
  }

  async function write(fact: MemoryFact) {
    await repos.documents.put<MemoryFact>({ kind: MEMORY_KIND, id: fact.id, workspaceId: fact.workspaceId, refId: scopeOf(fact.systemId), data: fact });
  }

  /** Facts that hold now, for a workflow plus the workspace-wide ones. */
  async function current(workspaceId: string, systemId?: string): Promise<MemoryFact[]> {
    const lists = await Promise.all([systemId ? inScope(workspaceId, systemId) : Promise.resolve([]), inScope(workspaceId)]);
    return lists.flat().filter((f) => !f.invalidAt);
  }

  return {
    /**
     * Store a fact. The same sentence twice returns the existing fact; a fact
     * with the key of a current one replaces it (the old one stays in history).
     */
    async remember(ctx: Pick<AppContext, "workspaceId">, input: { systemId?: string; text: unknown; key?: unknown; source: MemorySource }): Promise<{ fact: MemoryFact; replaced?: MemoryFact; duplicate: boolean }> {
      const text = typeof input.text === "string" ? input.text.replace(/\s+/g, " ").trim() : "";
      if (!text) throw new MemoryError("bad_request", "A fact needs text.");
      if (text.length > MAX_FACT_LENGTH) throw new MemoryError("bad_request", `Keep a fact under ${MAX_FACT_LENGTH} characters. Store one thing per fact.`);
      if (looksSecret(text)) throw new MemoryError("looks_secret", "That looks like a credential. Memory is shown to every performer, so keep secrets in a connection instead.");
      const key = cleanKey(input.key);
      const facts = await inScope(ctx.workspaceId, input.systemId);
      const live = facts.filter((f) => !f.invalidAt);
      const same = live.find((f) => normalize(f.text) === normalize(text));
      if (same) return { fact: same, duplicate: true };
      const previous = key ? live.find((f) => f.key === key) : undefined;
      if (!previous && live.length >= MAX_FACTS_PER_SCOPE) throw new MemoryError("memory_full", `This memory holds ${MAX_FACTS_PER_SCOPE} facts. Forget some, or give related facts a key so newer ones replace older ones.`);
      const now = clock().toISOString();
      const fact: MemoryFact = { id: `mem_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, workspaceId: ctx.workspaceId, systemId: input.systemId, text, key, source: input.source, validAt: now, supersedes: previous?.id };
      await write(fact);
      let replaced: MemoryFact | undefined;
      if (previous) {
        replaced = { ...previous, invalidAt: now, invalidReason: "Replaced by a newer fact.", supersededBy: fact.id };
        await write(replaced);
      }
      return { fact, replaced, duplicate: false };
    },

    /** Mark a fact as no longer true. It stays in the history. */
    async forget(ctx: Pick<AppContext, "workspaceId">, id: string, reason?: string): Promise<MemoryFact> {
      const doc = await repos.documents.get<MemoryFact>(MEMORY_KIND, id);
      if (!doc || doc.workspaceId !== ctx.workspaceId) throw new MemoryError("not_found", "No fact with that id.");
      if (doc.data.invalidAt) return doc.data;
      const fact = { ...doc.data, invalidAt: clock().toISOString(), invalidReason: (typeof reason === "string" && reason.trim().slice(0, 200)) || "Forgotten." };
      await write(fact);
      return fact;
    },

    async get(ctx: Pick<AppContext, "workspaceId">, id: string): Promise<MemoryFact | null> {
      const doc = await repos.documents.get<MemoryFact>(MEMORY_KIND, id);
      return doc && doc.workspaceId === ctx.workspaceId ? doc.data : null;
    },

    /** Facts that hold now, best match first. */
    async search(ctx: Pick<AppContext, "workspaceId">, input: { systemId?: string; query?: string; limit?: number }) {
      const limit = Math.min(Math.max(1, Math.floor(input.limit ?? 10)), 50);
      return rank(await current(ctx.workspaceId, input.systemId), input.query, limit);
    },

    /** Everything for one scope, history included, newest first. For the memory page. */
    async history(ctx: Pick<AppContext, "workspaceId">, systemId?: string): Promise<MemoryFact[]> {
      return (await inScope(ctx.workspaceId, systemId)).sort((a, b) => b.validAt.localeCompare(a.validAt));
    },

    /**
     * What a performer should know for this step: facts matching the step's
     * title and instructions. When nothing matches, the newest workflow facts.
     */
    async forStep(ctx: Pick<AppContext, "workspaceId">, systemId: string, step: { title: string; instructions?: string; doneWhen?: string }) {
      const facts = await current(ctx.workspaceId, systemId);
      if (facts.length === 0) return [];
      const matched = rank(facts, [step.title, step.instructions, step.doneWhen].filter(Boolean).join(" "), STEP_MEMORY_LIMIT);
      return matched.length ? matched : rank(facts.filter((f) => f.systemId === systemId), undefined, STEP_MEMORY_LIMIT);
    }
  };
}

export type MemoryService = ReturnType<typeof createMemoryService>;

/** The shape a performer sees: enough to use and cite a fact, nothing internal. */
export function publicFact(f: MemoryFact) {
  return { id: f.id, text: f.text, key: f.key, scope: f.systemId ? "workflow" : "workspace", learnedAt: f.validAt, from: f.source.stepTitle ? `${f.source.label ?? f.source.type}, ${f.source.stepTitle}` : f.source.label ?? f.source.type, runId: f.source.runId };
}
