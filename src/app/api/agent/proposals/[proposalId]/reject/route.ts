import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await params;
    const { ctx, repositories } = await getServerApp();
    const body = await request.json().catch(() => ({}));
    const service = new AgentRunService(repositories);
    return NextResponse.json(success(await service.reviewProposal(ctx, { proposalId, decision: "rejected", note: body.note })));
  } catch (error) {
    return apiError(error);
  }
}
