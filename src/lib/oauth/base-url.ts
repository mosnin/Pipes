import { env } from "@/lib/env";

/** The public origin used in OAuth metadata. Prefers NEXT_PUBLIC_APP_URL unless it is the local default. */
export function publicOrigin(request: Request): string {
  const configured = env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes("localhost:3000")) return configured.replace(/\/$/, "");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${proto}://${forwardedHost}`;
  return new URL(request.url).origin;
}
