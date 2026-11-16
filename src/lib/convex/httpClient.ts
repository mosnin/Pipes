import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

/**
 * Server-only Convex access. Every Pipes Convex function requires the shared
 * server key (see convex/lib.ts), which this client adds to each call. The key
 * never reaches the browser.
 */
export function getConvexHttpClient() {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Convex URL is required in real integration mode.");
  const serverKey = process.env.PIPES_CONVEX_SERVER_KEY;
  if (!serverKey) throw new Error("PIPES_CONVEX_SERVER_KEY is required in real integration mode. Set the same value on the Convex deployment.");
  const client = new ConvexHttpClient(url);
  return {
    query<F extends FunctionReference<"query">>(fn: F, args: Omit<F["_args"], "serverKey">): Promise<F["_returnType"]> {
      return client.query(fn, { ...(args as object), serverKey } as F["_args"]);
    },
    mutation<F extends FunctionReference<"mutation">>(fn: F, args: Omit<F["_args"], "serverKey">): Promise<F["_returnType"]> {
      return client.mutation(fn, { ...(args as object), serverKey } as F["_args"]);
    }
  };
}
