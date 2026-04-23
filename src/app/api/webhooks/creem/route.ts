import { NextResponse } from "next/server";
import { createConvexRepositories } from "@/lib/repositories/convex";
import { createMockRepositories } from "@/lib/repositories/mock";
import { runtimeFlags } from "@/lib/env";
import { createBoundedServices } from "@/domain/services/bounded";

export async function POST(request: Request) {
  const repositories = !runtimeFlags.useMocks && runtimeFlags.hasConvex ? createConvexRepositories() : createMockRepositories();
  const services = createBoundedServices(repositories);
  const ok = await services.billing.handleWebhook(request);
  return NextResponse.json({ ok });
}
