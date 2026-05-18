import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { PatternLearningService } from "@/domain/services/pattern_learning";

export async function GET(_request: Request, { params }: { params: Promise<{ systemId: string }> }) {
  try {
    const { systemId } = await params;
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new PatternLearningService(repositories).listPatterns(ctx, systemId)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ systemId: string }> }) {
  try {
    const { systemId } = await params;
    const { ctx, repositories } = await getServerApp();
    return NextResponse.json(success(await new PatternLearningService(repositories).learnFromSystem(ctx, systemId)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
