import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { ctx, services, identity } = await getServerApp();
    services.access.ensureInternalOperator(identity.email);
    const url = new URL(request.url);
    const userEmail = url.searchParams.get("userEmail") ?? "";
    const userId = url.searchParams.get("userId") ?? "";
    const systemId = url.searchParams.get("systemId") ?? "";
    const actorType = (url.searchParams.get("actorType") ?? undefined) as "user" | "agent" | undefined;
    const actionPrefix = url.searchParams.get("actionPrefix") ?? undefined;
    const transport = url.searchParams.get("transport") ?? undefined;
    const since = url.searchParams.get("since") ?? undefined;
    const until = url.searchParams.get("until") ?? undefined;

    const workspace = await services.admin.inspectWorkspace(ctx);
    const audits = await services.protocol.listAudits(ctx, { actorType, actionPrefix, transport, since, until, limit: 200 });
    const user = await services.admin.findUser(ctx, { email: userEmail || undefined, userId: userId || undefined });
    const system = systemId ? await services.admin.inspectSystem(ctx, systemId) : null;
    const actorAudits = userId ? await services.protocol.listAudits(ctx, { actorId: userId, since, until, limit: 100 }) : [];

    return NextResponse.json(success({ workspace, audits, user, system, actorAudits }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 403 });
  }
}
