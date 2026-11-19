import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { AgentCollaborationService } from "@/domain/services/agent_collaboration";
import { failure, success } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ctx, repositories } = await getServerApp();
    const service = new AgentCollaborationService(repositories);
    const feedback = await service.approvals.addApprovalFeedback(ctx, body);
    const decision = body.decision ? await service.approvals.addDecision(ctx, { ...body, note: body.note ?? "" }) : null;
    return NextResponse.json(success({ feedback, decision }));
  } catch (error) { return apiError(error); }
}
