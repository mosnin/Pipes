import { NextResponse } from "next/server";
import { runtimeFlags } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "pipes",
    mode: runtimeFlags.useMocks ? "mock" : "integration",
    providers: { convex: runtimeFlags.hasConvex, clerk: runtimeFlags.hasClerk },
    timestamp: new Date().toISOString()
  });
}
