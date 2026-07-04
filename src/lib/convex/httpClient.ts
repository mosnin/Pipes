import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";

// Server-side Convex client. The Convex data functions authorize the caller by
// Clerk identity, so during a request we forward the user's Clerk "convex" JWT
// to Convex via setAuth — the server then presents the SAME identity the
// browser does, and membership checks pass for the acting user. Outside a
// request context (no Clerk session) the token is simply absent; callers of
// authorized functions must run within a request.
export async function getConvexHttpClient() {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Convex URL is required in real integration mode.");
  const client = new ConvexHttpClient(url);
  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });
    if (token) client.setAuth(token);
  } catch {
    // No request-scoped Clerk session (e.g. build-time or a background job).
    // Leave the client unauthenticated; authorized functions will reject.
  }
  return client;
}
