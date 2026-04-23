import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const url = new URL(request.url);
    const actorType = (url.searchParams.get("actorType") ?? undefined) as "user" | "agent" | undefined;
    const actorId = url.searchParams.get("actorId") ?? undefined;
    const actionPrefix = url.searchParams.get("actionPrefix") ?? undefined;
    const systemId = url.searchParams.get("systemId") ?? undefined;
    const transport = url.searchParams.get("transport") ?? undefined;
    const outcome = (url.searchParams.get("outcome") ?? undefined) as "success" | "failure" | undefined;
    const since = url.searchParams.get("since") ?? undefined;
    const until = url.searchParams.get("until") ?? undefined;
    const format = url.searchParams.get("format") ?? "json";
    const audits = await services.protocol.listAudits(ctx, { actorType, actorId, actionPrefix, systemId, transport, outcome, since, until });
    if (format === "csv") {
      const header = "createdAt,actorType,actorId,action,targetType,targetId,outcome,metadata\n";
      const lines = audits.map((a) => [a.createdAt, a.actorType, a.actorId, a.action, a.targetType, a.targetId ?? "", a.outcome, (a.metadata ?? "").replaceAll(",", ";")].join(","));
      return new NextResponse(`${header}${lines.join("\n")}`, { headers: { "content-type": "text/csv" } });
    }
    return NextResponse.json(success(audits));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
