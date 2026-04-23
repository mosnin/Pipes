import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const { repositories } = await getServerApp();
    return NextResponse.json(success(await repositories.agentBuilder.getRunPolicySnapshot({ runId })));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
