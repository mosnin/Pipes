import { describe, expect, it } from "vitest";
import { createMemoryService, looksSecret, MAX_FACTS_PER_SCOPE, MemoryError, rank, type MemoryFact } from "@/domain/memory/service";
import type { RepositorySet, StoredDocument } from "@/lib/repositories/contracts";

function repos(): RepositorySet {
  const docs = new Map<string, StoredDocument<any>>();
  const k = (kind: string, id: string) => `${kind}/${id}`;
  return {
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
  } as unknown as RepositorySet;
}

const ctx = { workspaceId: "wks", userId: "u_bea", actorType: "user" as const };
const cal = { workspaceId: "wks", userId: "u_cal", actorType: "user" as const };
const source = { type: "agent" as const, actorId: "agent_1" };

function service() {
  let t = Date.parse("2026-11-01T00:00:00Z");
  return createMemoryService(repos(), () => new Date((t += 60_000)));
}

describe("workflow memory", () => {
  it("remembers a fact once, however it is spaced", async () => {
    const m = service();
    const a = await m.remember(ctx, { systemId: "sys", text: "Acme wants invoices in euros.", source });
    const b = await m.remember(ctx, { systemId: "sys", text: "  acme wants invoices   in euros. ", source });
    expect(b.duplicate).toBe(true);
    expect(b.fact.id).toBe(a.fact.id);
    expect(await m.history(ctx, "workflow", "sys")).toHaveLength(1);
  });

  it("replaces a fact with the same key and keeps the old one in history", async () => {
    const m = service();
    const old = await m.remember(ctx, { systemId: "sys", text: "Acme wants invoices in dollars.", key: "Acme invoice currency", source });
    const next = await m.remember(ctx, { systemId: "sys", text: "Acme wants invoices in euros.", key: "acme-invoice-currency", source });
    expect(next.replaced?.id).toBe(old.fact.id);
    expect(next.fact.supersedes).toBe(old.fact.id);
    const now = await m.search(ctx, { systemId: "sys", query: "invoice currency" });
    expect(now.map((f) => f.text)).toEqual(["Acme wants invoices in euros."]);
    const history = await m.history(ctx, "workflow", "sys");
    const stale = history.find((f) => f.id === old.fact.id)!;
    expect(stale.invalidAt).toBeTruthy();
    expect(stale.supersededBy).toBe(next.fact.id);
  });

  it("forgets without erasing, and forgetting twice is harmless", async () => {
    const m = service();
    const { fact } = await m.remember(ctx, { systemId: "sys", text: "The staging API is down on Sundays.", source });
    const gone = await m.forget(ctx, fact.id, "Fixed in November.");
    expect(gone.invalidReason).toBe("Fixed in November.");
    expect((await m.forget(ctx, fact.id)).invalidAt).toBe(gone.invalidAt);
    expect(await m.search(ctx, { systemId: "sys" })).toHaveLength(0);
    expect(await m.history(ctx, "workflow", "sys")).toHaveLength(1);
  });

  it("refuses credentials, empty and long facts", async () => {
    const m = service();
    await expect(m.remember(ctx, { systemId: "sys", text: "Use key sk-abcdefghijklmnopqrstuvwx for billing", source })).rejects.toMatchObject({ code: "looks_secret" });
    await expect(m.remember(ctx, { systemId: "sys", text: "   ", source })).rejects.toBeInstanceOf(MemoryError);
    await expect(m.remember(ctx, { systemId: "sys", text: "x".repeat(501), source })).rejects.toMatchObject({ code: "bad_request" });
    expect(looksSecret("Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123")).toBe(true);
    expect(looksSecret("Ask Bea before refunding over $500.")).toBe(false);
  });

  it("keeps workflows apart, and shares workspace facts with every workflow", async () => {
    const m = service();
    await m.remember(ctx, { systemId: "a", text: "Refunds over $500 need finance.", source });
    await m.remember(ctx, { systemId: "b", text: "Refunds are never issued in cash.", source });
    await m.remember(ctx, { text: "Refunds go out on Fridays.", source });
    const forA = (await m.search(ctx, { systemId: "a", query: "refunds" })).map((f) => f.text).sort();
    expect(forA).toEqual(["Refunds go out on Fridays.", "Refunds over $500 need finance."]);
    expect(await m.search({ ...ctx, workspaceId: "other" }, { systemId: "a", query: "refunds" })).toHaveLength(0);
  });

  it("gives a step the facts that match it, else the newest workflow facts", async () => {
    const m = service();
    await m.remember(ctx, { systemId: "sys", text: "Acme invoices go to billing@acme.test.", source });
    await m.remember(ctx, { systemId: "sys", text: "The warehouse closes at 5pm.", source });
    const matched = await m.forStep(ctx, "sys", { title: "Send the invoice", instructions: "Email the invoice to the customer." });
    expect(matched.map((f) => f.text)).toEqual(["Acme invoices go to billing@acme.test."]);
    const fallback = await m.forStep(ctx, "sys", { title: "Plan the week" });
    expect(fallback[0].text).toBe("The warehouse closes at 5pm.");
  });

  it("ranks rarer shared words higher", () => {
    const f = (id: string, text: string, validAt = "2026-11-01T00:00:00Z"): MemoryFact => ({ id, workspaceId: "w", text, source, validAt });
    const facts = [f("1", "The customer prefers email."), f("2", "The customer is on the Pro plan."), f("3", "Chargebacks go to the customer success lead.")];
    expect(rank(facts, "chargeback customer", 3)[0].id).toBe("3");
    expect(rank(facts, "unrelated words", 3)).toHaveLength(0);
  });

  it("stops at the size limit unless a key replaces a fact", async () => {
    const m = service();
    for (let i = 0; i < MAX_FACTS_PER_SCOPE; i++) await m.remember(ctx, { systemId: "sys", text: `Fact number ${i}`, key: i === 0 ? "first" : undefined, source });
    await expect(m.remember(ctx, { systemId: "sys", text: "One too many", source })).rejects.toMatchObject({ code: "memory_full" });
    await expect(m.remember(ctx, { systemId: "sys", text: "A newer first fact", key: "first", source })).resolves.toMatchObject({ duplicate: false });
  });

  it("keeps private memories to their owner, whatever the other person's role", async () => {
    const m = service();
    const mine = await m.remember(ctx, { scope: "private", systemId: "sys", text: "I prefer refunds handled before noon.", key: "my-refund-time", source });
    expect(mine.fact.ownerId).toBe("u_bea");
    expect(mine.fact.systemId).toBeUndefined();
    await m.remember(ctx, { scope: "team", text: "Refunds over $500 need finance.", source });

    // The owner sees it alongside team facts.
    expect((await m.search(ctx, { systemId: "sys", query: "refunds" })).map((f) => f.text).sort()).toEqual(["I prefer refunds handled before noon.", "Refunds over $500 need finance."]);
    // Someone else in the same workspace, even the Owner, does not, by search, by id, or by step.
    const owner = { ...cal, role: "Owner" };
    expect((await m.search(owner, { systemId: "sys", query: "refunds" })).map((f) => f.text)).toEqual(["Refunds over $500 need finance."]);
    expect(await m.get(owner, mine.fact.id)).toBeNull();
    await expect(m.forget(owner, mine.fact.id)).rejects.toMatchObject({ code: "not_found" });
    expect(await m.history(owner, "private")).toEqual([]);
    expect((await m.forStep(owner, "sys", { title: "Handle refunds" })).map((f) => f.text)).not.toContain("I prefer refunds handled before noon.");
    // Writing "private" as someone else only ever writes to their own.
    const theirs = await m.remember(cal, { scope: "private", text: "Cal's own note about refunds.", source });
    expect(theirs.fact.ownerId).toBe("u_cal");
    expect((await m.history(ctx, "private")).map((f) => f.text)).toEqual(["I prefer refunds handled before noon."]);
  });

  it("needs memory:private for an agent token to reach its creator's private memories", async () => {
    const m = service();
    await m.remember(ctx, { scope: "private", text: "Bea's private preference about invoices.", source });
    const agent = { workspaceId: "wks", userId: "u_bea", actorType: "agent" as const, capabilities: ["memory:read", "memory:write"] };
    expect(await m.search(agent, { query: "invoices" })).toEqual([]);
    await expect(m.remember(agent, { scope: "private", text: "A new private fact.", source })).rejects.toMatchObject({ code: "not_allowed" });
    const trusted = { ...agent, capabilities: [...agent.capabilities, "memory:private"] };
    expect((await m.search(trusted, { query: "invoices" })).map((f) => f.text)).toEqual(["Bea's private preference about invoices."]);
    // Even with it, an agent made by Cal sees only Cal's.
    expect(await m.search({ ...trusted, userId: "u_cal" }, { query: "invoices" })).toEqual([]);
  });

  it("erases a person's private memories on request, and only theirs", async () => {
    const m = service();
    await m.remember(ctx, { scope: "private", text: "First private note.", source });
    await m.remember(ctx, { scope: "private", text: "Second private note.", source });
    await m.remember(cal, { scope: "private", text: "Cal's note.", source });
    await m.remember(ctx, { scope: "team", text: "A team note.", source });
    expect(await m.purgePrivate(ctx)).toBe(2);
    expect(await m.history(ctx, "private")).toEqual([]);
    expect((await m.history(cal, "private")).map((f) => f.text)).toEqual(["Cal's note."]);
    expect((await m.history(ctx, "team")).length).toBe(1);
    await expect(m.purgePrivate({ ...ctx, actorType: "agent", capabilities: ["memory:private"] })).rejects.toMatchObject({ code: "not_allowed" });
  });
});
