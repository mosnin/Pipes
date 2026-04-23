import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const { repositories } = await getServerApp();
    const [decisions, escalations, usage] = await Promise.all([
      repositories.agentBuilder.listPolicyDecisionRecords({ runId }),
      repositories.agentBuilder.listEscalationRecords({ runId }),
      repositories.agentBuilder.getRuntimeUsageRecord({ runId })
    ]);
    return NextResponse.json(success({ decisions, escalations, usage }));
  } catch (error) { return NextResponse.json(failure((error as Error).message), { status: 400 }); }
}
