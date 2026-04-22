import { NextResponse } from "next/server";
import { runtimeFlags } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "pipes",
    mode: runtimeFlags.useMocks ? "mock" : "integration",
    providers: { convex: runtimeFlags.hasConvex, auth0: runtimeFlags.hasAuth0 },
    timestamp: new Date().toISOString()
  });
}
