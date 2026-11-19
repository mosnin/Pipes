import { NextResponse } from "next/server";
import { createWorkflowServices } from "@/domain/workflow";
import { triggerContext } from "@/lib/api/trigger-context";
import { getRepositories } from "@/lib/composition/server";

/**
 * Fires due schedules. Call it every minute or few from a scheduler (Vercel
 * Cron, cron-job.org, GitHub Actions) with `Authorization: Bearer $CRON_SECRET`.
 * A schedule that was due several times since the last call runs once.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized", message: "Set CRON_SECRET and send it as a bearer token." }, { status: 401 });
  }
  const repositories = getRepositories();
  const workflow = createWorkflowServices(repositories);
  const due = await workflow.triggers.collectDue();
  const results: Array<{ systemId: string; scheduleId: string; runId?: string; error?: string }> = [];
  for (const item of due) {
    try {
      const ctx = await triggerContext(repositories, item.workspaceId, `schedule:${item.schedule.id}`);
      // One run per schedule per minute, even if two cron calls overlap.
      const minute = new Date().toISOString().slice(0, 16);
      const run = await workflow.runs.start(ctx, { systemId: item.systemId, trigger: "schedule", input: item.schedule.input, actorLabel: item.schedule.label ?? "Schedule", idempotencyKey: `sched:${item.schedule.id}:${minute}` });
      results.push({ systemId: item.systemId, scheduleId: item.schedule.id, runId: run.id });
    } catch (error) {
      results.push({ systemId: item.systemId, scheduleId: item.schedule.id, error: (error as Error).message });
    }
  }
  return NextResponse.json({ ok: true, data: { fired: results.length, results } });
}

export const GET = handle;
export const POST = handle;
