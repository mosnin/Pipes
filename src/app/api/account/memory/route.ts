import { createMemoryService } from "@/domain/memory/service";
import { getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

/**
 * Erase every private memory the signed-in person has in this workspace,
 * history included (docs/memory.md). Only the person themselves can do this;
 * agent tokens cannot, even with memory:private.
 */
export async function DELETE() {
  try {
    const { ctx, repositories } = await getWorkflowApp();
    const erased = await createMemoryService(repositories).purgePrivate(ctx);
    await repositories.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "memory.private_erased", targetType: "user", targetId: ctx.userId, outcome: "success", metadata: JSON.stringify({ erased }) });
    return ok({ erased });
  } catch (error) {
    return workflowError(error);
  }
}
