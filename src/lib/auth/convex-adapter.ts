import "server-only";
import { convexAdapter } from "@convex-dev/better-auth";
import { makeFunctionReference } from "convex/server";
import { getConvexHttpClient } from "@/lib/convex/httpClient";

/**
 * Better Auth's own Convex adapter, run from the Next server. It reaches the
 * Better Auth component's tables through `convex/authBridge.ts`, whose
 * functions require Pipes' server key like every other Convex function, so
 * nobody with the Convex URL alone can read or write accounts or sessions.
 */
const q = (name: string) => makeFunctionReference<"query">(`authBridge:${name}`);
const m = (name: string) => makeFunctionReference<"mutation">(`authBridge:${name}`);

const refs = {
  adapter: {
    findOne: q("findOne"),
    findMany: q("findMany"),
    create: m("create"),
    updateOne: m("updateOne"),
    updateMany: m("updateMany"),
    deleteOne: m("deleteOne"),
    deleteMany: m("deleteMany"),
    consumeOne: m("consumeOne"),
    incrementOne: m("incrementOne")
  }
};

type Where = { field?: string; operator?: string; value?: unknown };

/**
 * Better Auth 1.7 clears stale challenge rows with `_id ne X`; the Convex
 * component accepts `_id` only with eq, in and not_in. `ne X` and
 * `not_in [X]` select the same rows, so rewrite it. Covered by the browser
 * run against Convex (docs/security.md, "Verification").
 */
export function compatibleArgs<T>(args: T): T {
  if (!args || typeof args !== "object") return args;
  const fix = (where: unknown) => (Array.isArray(where) ? where.map((w: Where) => (w?.field === "_id" && w.operator === "ne" ? { ...w, operator: "not_in", value: [w.value] } : w)) : where);
  const out = { ...(args as Record<string, unknown>) };
  if ("where" in out) out.where = fix(out.where);
  if (out.input && typeof out.input === "object") out.input = compatibleArgs(out.input);
  return out as T;
}

type Cond = { field: string; operator?: string; value: unknown; connector?: string };

/** Whether a row satisfies one where condition, for the conditions the fallback below applies itself. */
export function matches(row: Record<string, unknown>, c: Cond): boolean {
  const v = row[c.field] as number | string;
  const x = c.value as number | string;
  switch (c.operator ?? "eq") {
    case "eq": return v === x;
    case "ne": return v !== x;
    case "lt": return v < x;
    case "lte": return v <= x;
    case "gt": return v > x;
    case "gte": return v >= x;
    case "in": return Array.isArray(c.value) && c.value.includes(v);
    case "not_in": return Array.isArray(c.value) && !c.value.includes(v);
    default: return false;
  }
}

export function convexBridgeAdapter() {
  const client = getConvexHttpClient();

  /**
   * Better Auth 1.7 clears stale rows with a range condition the component
   * can only serve from a matching index. When it refuses one, select by the
   * exact-match conditions, apply the rest here, and delete by id. Same rows,
   * same result shape.
   */
  async function deleteManyFallback(input: { input: { model: string; where: Cond[] } }) {
    const { model, where } = input.input;
    if (where.some((w) => w.connector === "OR")) throw new Error("where clause not supported");
    const exact = where.filter((w) => (w.operator ?? "eq") === "eq" && w.field !== "_id");
    const found = (await client.query(refs.adapter.findMany, { input: { model, where: exact, paginationOpts: { numItems: 500, cursor: null } } } as never)) as { page: Array<Record<string, unknown>> };
    const doomed = found.page.filter((row) => where.every((c) => matches(row, c)));
    for (const row of doomed) await client.mutation(refs.adapter.deleteOne, { input: { input: { model, where: [{ field: "_id", operator: "eq", value: row._id }] } } } as never);
    return { count: doomed.length, ids: doomed.map((r) => r._id), isDone: true, continueCursor: "[]" };
  }

  const ctx = {
    runQuery: (fn: Parameters<typeof client.query>[0], input: unknown) => client.query(fn, { input: compatibleArgs(input) } as never),
    runMutation: (fn: Parameters<typeof client.mutation>[0], input: unknown) =>
      client.mutation(fn, { input: compatibleArgs(input) } as never).catch((error: Error) => {
        if (fn === refs.adapter.deleteMany && /Cannot use (lt|lte|gt|gte) on field/.test(error.message)) return deleteManyFallback(compatibleArgs(input) as never);
        throw error;
      })
  };
  // The adapter's types expect the component's internal references; the bridge has the same shape.
  return convexAdapter(ctx as never, refs as never);
}
