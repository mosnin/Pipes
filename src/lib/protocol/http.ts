import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getProtocolContext } from "@/lib/protocol/auth";
import { mapProtocolError, restErrorResponse } from "@/lib/protocol/errors";

export async function runProtocolRead(request: Request, bucket: string, handler: (ctx: Awaited<ReturnType<typeof getProtocolContext>>["ctx"], services: Awaited<ReturnType<typeof getProtocolContext>>["services"], requestId: string) => Promise<any>) {
  const requestId = crypto.randomUUID();
  try {
    const { ctx, services } = await getProtocolContext(request);
    await services.guards.consumeRateLimit(ctx, "rest", bucket, 120, 60);
    const data = await handler(ctx, services, requestId);
    return NextResponse.json({ ok: true, data, requestId });
  } catch (error) {
    const mapped = mapProtocolError(error);
    return NextResponse.json(restErrorResponse(error, requestId), { status: mapped.status });
  }
}

export async function runProtocolWrite(request: Request, input: {
  route: string;
  bucket: string;
  action: string;
  targetType: string;
  targetId?: string;
  systemId?: string;
  idempotent?: boolean;
  body: any;
  handler: (ctx: Awaited<ReturnType<typeof getProtocolContext>>["ctx"], services: Awaited<ReturnType<typeof getProtocolContext>>["services"], body: any, requestId: string) => Promise<any>;
}) {
  const requestId = crypto.randomUUID();
  try {
    const { ctx, services } = await getProtocolContext(request);
    await services.guards.consumeRateLimit(ctx, "rest", input.bucket, 60, 60);
    const idempotencyKey = input.idempotent ? request.headers.get("idempotency-key") ?? undefined : undefined;
    const result = await services.guards.withIdempotency(ctx, { key: idempotencyKey, route: input.route, body: input.body }, async () => {
      const data = await input.handler(ctx, services, input.body, requestId);
      return { statusCode: 200, data };
    });
    await services.protocol.writeAudit(ctx, { action: input.action, targetType: input.targetType, targetId: input.targetId, systemId: input.systemId, outcome: "success", metadata: JSON.stringify({ transport: "rest", requestId, replayed: result.replayed, idempotencyKey: idempotencyKey ?? null }) });
    return NextResponse.json({ ok: true, data: result.data, requestId, replayed: result.replayed });
  } catch (error) {
    const mapped = mapProtocolError(error);
    return NextResponse.json(restErrorResponse(error, requestId), { status: mapped.status });
  }
}
