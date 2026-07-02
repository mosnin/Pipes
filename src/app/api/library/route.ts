import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";

const LibraryActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("favorite"), systemId: z.string(), favorite: z.boolean() }),
  z.object({ action: z.literal("tags"), systemId: z.string(), tags: z.array(z.string().max(50)).max(20).default([]) }),
  z.object({ action: z.literal("archive"), systemId: z.string() }),
  z.object({ action: z.literal("restore"), systemId: z.string() }),
]);

export async function GET(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const status = (url.searchParams.get("status") ?? undefined) as "active" | "archived" | "favorites" | "mine" | "shared" | undefined;
    const sort = (url.searchParams.get("sort") ?? undefined) as "recent_activity" | "name" | "created" | "updated" | undefined;
    const tag = url.searchParams.get("tag") ?? undefined;
    return NextResponse.json(success(await services.library.query(ctx, { q, status, sort, tag })));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = LibraryActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Unsupported library action"), { status: 400 });
    }
    const body = parsed.data;
    if (body.action === "favorite") return NextResponse.json(success(await services.library.setFavorite(ctx, body.systemId, body.favorite)));
    if (body.action === "tags") return NextResponse.json(success(await services.library.setTags(ctx, body.systemId, body.tags)));
    if (body.action === "archive") return NextResponse.json(success(await services.library.archive(ctx, body.systemId)));
    return NextResponse.json(success(await services.library.restore(ctx, body.systemId)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
