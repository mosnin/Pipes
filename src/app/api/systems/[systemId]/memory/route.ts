import { MemoryError, scopeOfFact, type MemoryScope } from "@/domain/memory/service";
import { can } from "@/domain/permissions";
import { ensureCanEdit, ensureSystemInWorkspace, getWorkflowApp, ok, workflowError } from "@/lib/api/workflow";

type Params = { params: Promise<{ systemId: string }> };

/**
 * A workflow's memory (docs/memory.md): its own facts, the team's, and the
 * caller's private ones, which nobody else can see.
 * GET ?q= returns current facts (best match first when q is set) and the
 * history; POST { text, key?, scope? } remembers a fact as a person;
 * DELETE ?factId=&reason= forgets one. Facts are never erased.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, repositories, workflow } = await getWorkflowApp();
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    const [facts, ...histories] = await Promise.all([
      workflow.memory.search(ctx, { systemId, query: q, limit: 50 }),
      workflow.memory.history(ctx, "workflow", systemId),
      workflow.memory.history(ctx, "team"),
      workflow.memory.history(ctx, "private")
    ]);
    const history = histories.flat().filter((f) => f.invalidAt).sort((a, b) => (b.invalidAt ?? "").localeCompare(a.invalidAt ?? "")).slice(0, 100);
    return ok({ facts: facts.map((f) => ({ ...f, scope: scopeOfFact(f) })), history: history.map((f) => ({ ...f, scope: scopeOfFact(f) })), canEdit: can(ctx.role, "workflows.edit") });
  } catch (error) {
    return workflowError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, identity, repositories, workflow } = await getWorkflowApp();
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    const body = await request.json().catch(() => ({}));
    const scope = parseScope(body.scope);
    // Private memory is personal: any member may keep their own. Shared memory needs edit rights.
    if (scope !== "private") ensureCanEdit(ctx);
    const result = await workflow.memory.remember(ctx, { scope, systemId, text: body.text, key: body.key, source: { type: "person", actorId: ctx.actorId, label: identity.name } });
    return ok(result, result.duplicate ? 200 : 201);
  } catch (error) {
    return workflowError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { systemId } = await params;
    const { ctx, repositories, workflow } = await getWorkflowApp();
    await ensureSystemInWorkspace(repositories, ctx, systemId);
    const url = new URL(request.url);
    const fact = await workflow.memory.get(ctx, url.searchParams.get("factId") ?? "");
    if (!fact || (fact.systemId && fact.systemId !== systemId)) throw new MemoryError("not_found", "No fact with that id in this workflow.");
    if (!fact.ownerId) ensureCanEdit(ctx);
    return ok(await workflow.memory.forget(ctx, fact.id, url.searchParams.get("reason") ?? undefined));
  } catch (error) {
    return workflowError(error);
  }
}

/** Old clients sent "workspace" for team memory. */
function parseScope(value: unknown): MemoryScope {
  if (value === "private" || value === "team") return value;
  if (value === "workspace") return "team";
  return "workflow";
}
