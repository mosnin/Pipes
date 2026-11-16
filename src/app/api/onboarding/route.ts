import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { getWorkflowApp } from "@/lib/api/workflow";
import { getRepositories } from "@/lib/composition/server";

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

/**
 * Get started progress, from real workspace data: a workflow exists, an agent
 * holds a token, a run has started, a teammate is in or invited.
 */
export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    const { workflow } = await getWorkflowApp();
    const repos = getRepositories();
    const [systems, tokens, runs, members, invites] = await Promise.all([
      services.systems.list(ctx),
      services.protocol.listTokens(ctx).catch(() => []),
      workflow.runs.listForWorkspace(ctx),
      repos.memberships.list(ctx.workspaceId),
      repos.invites.list(ctx.workspaceId)
    ]);
    return NextResponse.json(
      success({
        workflow: systems.length > 0,
        agent: tokens.length > 0,
        run: runs.length > 0,
        teammate: members.length > 1 || invites.length > 0
      })
    );
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
