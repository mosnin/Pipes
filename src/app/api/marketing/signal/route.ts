import { NextResponse } from "next/server";
import { success } from "@/lib/api/response";
import { publicContentService } from "@/domain/services/public";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accepted = publicContentService.trackGrowthEvent(String(body.event ?? ""), body.metadata ?? {});
    return NextResponse.json(success({ ok: accepted }), { status: accepted ? 200 : 400 });
  } catch {
    return NextResponse.json(success({ ok: false }), { status: 400 });
  }
}
