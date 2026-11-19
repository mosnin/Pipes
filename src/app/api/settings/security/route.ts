import { createSecurityService, IDLE_LIMITS } from "@/domain/auth/security";
import { can, PERMISSIONS, permissionsFor, ROLES } from "@/domain/permissions";
import { ensureCan, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

/**
 * The workspace's sign-in policy and its roles (docs/security.md, docs/rbac.md).
 * GET is open to every member, so people can see the rules they work under;
 * PUT { requireMfa?, idleTimeoutMinutes?, allowedDomains? } needs security.manage.
 */
export async function GET() {
  try {
    const { ctx, repositories } = await getWorkflowApp();
    const policy = await createSecurityService(repositories).policy(ctx.workspaceId);
    return ok({
      policy,
      limits: IDLE_LIMITS,
      canChange: ctx.actorType === "user" && can(ctx.role, "security.manage"),
      myRole: ctx.role,
      roles: ROLES.map((role) => ({ role, permissions: permissionsFor(role) })),
      permissions: Object.entries(PERMISSIONS).map(([key, p]) => ({ key, min: p.min, label: p.label }))
    });
  } catch (error) {
    return workflowError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { ctx, identity, repositories } = await getWorkflowApp();
    ensureCan(ctx, "security.manage");
    const body = await request.json().catch(() => ({}));
    const policy = await createSecurityService(repositories).savePolicy(ctx.workspaceId, body, { userId: ctx.userId, externalId: identity.externalId, email: identity.email });
    return ok({ policy });
  } catch (error) {
    return workflowError(error);
  }
}
