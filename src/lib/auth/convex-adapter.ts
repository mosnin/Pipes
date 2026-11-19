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

export function convexBridgeAdapter() {
  const client = getConvexHttpClient();
  const ctx = {
    runQuery: (fn: Parameters<typeof client.query>[0], input: unknown) => client.query(fn, { input } as never),
    runMutation: (fn: Parameters<typeof client.mutation>[0], input: unknown) => client.mutation(fn, { input } as never)
  };
  // The adapter's types expect the component's internal references; the bridge has the same shape.
  return convexAdapter(ctx as never, refs as never);
}
