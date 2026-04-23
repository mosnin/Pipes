import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

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
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.action === "favorite") return NextResponse.json(success(await services.library.setFavorite(ctx, body.systemId, Boolean(body.favorite))));
    if (body.action === "tags") return NextResponse.json(success(await services.library.setTags(ctx, body.systemId, body.tags ?? [])));
    if (body.action === "archive") return NextResponse.json(success(await services.library.archive(ctx, body.systemId)));
    if (body.action === "restore") return NextResponse.json(success(await services.library.restore(ctx, body.systemId)));
    return NextResponse.json(failure("Unsupported library action"), { status: 400 });
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
