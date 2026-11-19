import { resolveAuthMode } from "@/lib/auth";
import { getAuth } from "@/lib/auth/server";

/** Better Auth's endpoints: sign-up, sign-in, two-step, sessions, passwords (docs/security.md). */
async function handle(request: Request) {
  if (resolveAuthMode() === "mock") return Response.json({ ok: false, error: "demo_mode", message: "This is a demo deployment: everyone is signed in as the demo owner." }, { status: 404 });
  if (resolveAuthMode() === "unconfigured") return Response.json({ ok: false, error: "auth_not_configured", message: "Sign-in is not configured on this deployment." }, { status: 503 });
  return (await getAuth()).handler(request);
}

export const GET = handle;
export const POST = handle;
