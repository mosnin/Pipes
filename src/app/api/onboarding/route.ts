import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";

const StartSchema = z.object({ action: z.literal("start") });
const RecommendSchema = z.object({
  action: z.literal("recommend"),
  role: z.string().max(100).optional(),
  useCase: z.string().max(500).optional(),
});
const CompleteSchema = z.object({
  action: z.literal("complete"),
  role: z.string().max(100).optional(),
  useCase: z.string().max(500).optional(),
  chosenPath: z.enum(["blank", "template", "ai", "import"]).default("blank"),
});

const OnboardingBodySchema = z.discriminatedUnion("action", [StartSchema, RecommendSchema, CompleteSchema]);

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = OnboardingBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Unsupported onboarding action"), { status: 400 });
    }
    const body = parsed.data;
    if (body.action === "start") return NextResponse.json(success(await services.onboarding.start(ctx)));
    if (body.action === "recommend") return NextResponse.json(success(await services.onboarding.recommend(ctx, { role: body.role, useCase: body.useCase })));
    return NextResponse.json(success(await services.onboarding.complete(ctx, { role: body.role, useCase: body.useCase, chosenPath: body.chosenPath })));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
