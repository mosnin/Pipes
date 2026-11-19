import { NextResponse } from "next/server";
import { MemoryError } from "@/domain/memory/service";
import { AccessDenied, assertCan, type Permission } from "@/domain/permissions";
import { HttpError } from "@/lib/api/errors";
import { RunError } from "@/domain/runs/engine";
import { createWorkflowServices } from "@/domain/workflow";
import { getServerApp } from "@/lib/composition/server";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

const STATUS_BY_CODE: Record<string, number> = {
  run_not_found: 404,
  system_not_found: 404,
  not_allowed: 403,
  quota_exceeded: 429,
  run_finished: 409,
  awaiting_approval: 409,
  stale_step: 409,
  not_awaiting_approval: 409,
  // Rails (docs/rails.md)
  kill_switch: 423,
  concurrency_limit: 429,
  budget_steps: 409,
  budget_cost: 409,
  deadline_exceeded: 409,
  step_timeout: 409,
  invalid_output: 422,
  outcome_not_allowed: 422,
  conflict: 409,
  // Memory (docs/memory.md)
  not_found: 404,
  memory_full: 409,
  looks_secret: 422
};

export function workflowError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ ok: false, error: error.code, message: error.message, ...error.extra }, { status: error.status });
  if (error instanceof AccessDenied) return NextResponse.json({ ok: false, error: error.code, message: error.message, permission: error.permission }, { status: 403 });
  if (error instanceof RunError || error instanceof MemoryError) {
    return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: STATUS_BY_CODE[error.code] ?? 400 });
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return NextResponse.json({ ok: false, error: "bad_request", message }, { status: 400 });
}

/** Throws unless the system exists and belongs to the caller's workspace. */
export async function ensureSystemInWorkspace(repositories: RepositorySet, ctx: Pick<AppContext, "workspaceId">, systemId: string) {
  let workspaceId: string | undefined;
  try {
    workspaceId = (await repositories.systems.getBundle(systemId)).system.workspaceId;
  } catch {
    workspaceId = undefined;
  }
  if (workspaceId !== ctx.workspaceId) throw new RunError("system_not_found", "System not found.");
}

export async function getWorkflowApp() {
  const app = await getServerApp();
  return { ...app, workflow: createWorkflowServices(app.repositories) };
}

/** Editing a workflow or its triggers, connections and memory. */
export function ensureCanEdit(ctx: AppContext) {
  assertCan(ctx, "workflows.edit");
}

/** Any row of the permission table (src/domain/permissions, docs/rbac.md). */
export function ensureCan(ctx: AppContext, permission: Permission) {
  assertCan(ctx, permission);
}

export const ok = (data: unknown, status = 200) => NextResponse.json({ ok: true, data }, { status });
