import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.action === "start") return NextResponse.json(success(await services.onboarding.start(ctx)));
    if (body.action === "recommend") return NextResponse.json(success(await services.onboarding.recommend(ctx, { role: body.role, useCase: body.useCase })));
    if (body.action === "complete") return NextResponse.json(success(await services.onboarding.complete(ctx, { role: body.role, useCase: body.useCase, chosenPath: body.chosenPath })));
    return NextResponse.json(failure("Unsupported onboarding action"), { status: 400 });
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
