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
      return client.query(fn, { ...(args as object), serverKey } as F["_args"]).catch((error: unknown) => {
        throw cleanConvexError(error, serverKey);
      });
    },
    mutation<F extends FunctionReference<"mutation">>(fn: F, args: Omit<F["_args"], "serverKey">): Promise<F["_returnType"]> {
      return client.mutation(fn, { ...(args as object), serverKey } as F["_args"]).catch((error: unknown) => {
        throw cleanConvexError(error, serverKey);
      });
    }
  };
}

/**
 * Convex errors can echo the call's arguments, which include the server key
 * and sometimes session tokens. Errors may reach API responses, so keep only
 * the function's own message (what `throw new Error("...")` said in convex/)
 * and never the arguments. Validation and internal errors become a plain
 * sentence; the full detail stays in the Convex logs.
 */
export function cleanConvexError(error: unknown, serverKey?: string): Error {
  const raw = error instanceof Error ? error.message : String(error);
  const body = raw.split(/Server Error\s*\n/)[1] ?? raw;
  const first = body.split("\n")[0].trim();
  const own = first.match(/^Uncaught (?:Convex)?Error: (.+)$/);
  let message = own ? own[1] : /ValidationError|Server Error|Request ID/.test(raw) ? "Something went wrong on the server. Try again." : first;
  if (serverKey) message = message.split(serverKey).join("[redacted]");
  return new Error(message.slice(0, 300));
}