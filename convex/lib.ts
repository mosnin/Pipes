// @ts-nocheck
/**
 * Every Pipes Convex function is reachable only by the Pipes server.
 *
 * Convex functions are public endpoints and the deployment URL is not a
 * secret, so each query and mutation requires a `serverKey` argument that
 * must equal the PIPES_CONVEX_SERVER_KEY environment variable set on the
 * Convex deployment (`npx convex env set PIPES_CONVEX_SERVER_KEY ...`). The
 * Next.js server holds the same value and adds it to every call. Without the
 * variable on the deployment, every call is refused: it fails closed.
 */
import { mutation as rawMutation, query as rawQuery } from "./_generated/server";
import { v } from "convex/values";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function assertServer(serverKey: string) {
  const expected = process.env.PIPES_CONVEX_SERVER_KEY;
  if (!expected || expected.length < 32) throw new Error("PIPES_CONVEX_SERVER_KEY (32+ characters) is not set on this Convex deployment.");
  if (!constantTimeEqual(serverKey, expected)) throw new Error("Unauthorized.");
}

type Definition = { args?: Record<string, unknown>; handler: (ctx: any, args: any) => any };

export function query(definition: Definition) {
  return rawQuery({
    args: { ...(definition.args ?? {}), serverKey: v.string() },
    handler: async (ctx, { serverKey, ...args }) => {
      assertServer(serverKey);
      return definition.handler(ctx, args);
    }
  });
}

export function mutation(definition: Definition) {
  return rawMutation({
    args: { ...(definition.args ?? {}), serverKey: v.string() },
    handler: async (ctx, { serverKey, ...args }) => {
      assertServer(serverKey);
      return definition.handler(ctx, args);
    }
  });
}
