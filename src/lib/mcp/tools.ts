import { RunError } from "@/domain/runs/engine";
import type { createBoundedServices } from "@/domain/services/bounded";
import type { WorkflowServices } from "@/domain/workflow";
import { ensureSystemInWorkspace } from "@/lib/api/workflow";
import { ProtocolError } from "@/lib/protocol/errors";
import { hasCapability, type AgentCapability } from "@/lib/protocol/tokens";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

type Services = ReturnType<typeof createBoundedServices>;
export type ToolContext = { ctx: AppContext; services: Services; workflow: WorkflowServices; repositories: RepositorySet };

type JsonSchema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };

export type McpTool = {
  name: string;
  title: string;
  description: string;
  capability: AgentCapability;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  handler: (args: Record<string, any>, tc: ToolContext) => Promise<unknown>;
};

const str = (description: string) => ({ type: "string", description });
const obj = (properties: Record<string, unknown>, required: string[] = []): JsonSchema => ({ type: "object", properties, required, additionalProperties: false });

function scope(tc: ToolContext, systemId?: string) {
  if (tc.ctx.systemScope && systemId && tc.ctx.systemScope !== systemId) throw new ProtocolError("SCOPE_VIOLATION", "This token is scoped to another workflow.", 403);
}

async function ownedSystem(tc: ToolContext, systemId: unknown) {
  const id = String(systemId ?? "");
  if (!id) throw new RunError("bad_request", "systemId is required.");
  scope(tc, id);
  await ensureSystemInWorkspace(tc.repositories, tc.ctx, id);
  return id;
}

async function ownedRun(tc: ToolContext, runId: unknown) {
  const run = await tc.workflow.runs.get(tc.ctx, String(runId ?? ""));
  scope(tc, run.systemId);
  return run;
}

/** Everything an agent can do in Pipes over MCP. The run tools are the core loop. */
export const MCP_TOOLS: McpTool[] = [
  {
    name: "list_workflows",
    title: "List workflows",
    description: "List the workflows (systems) in this workspace. Use a workflow's id with start_run or get_workflow.",
    capability: "systems:read",
    inputSchema: obj({}),
    annotations: { readOnlyHint: true },
    handler: async (_args, tc) => {
      const systems = await tc.services.systems.list(tc.ctx);
      return systems.filter((s) => !tc.ctx.systemScope || s.id === tc.ctx.systemScope).map((s) => ({ id: s.id, name: s.name, description: s.description, updatedAt: s.updatedAt }));
    }
  },
  {
    name: "get_workflow",
    title: "Get a workflow",
    description: "Get a workflow's steps, routes and per-step instructions, so you can understand the procedure before running it.",
    capability: "systems:read",
    inputSchema: obj({ systemId: str("The workflow id.") }, ["systemId"]),
    annotations: { readOnlyHint: true },
    handler: async (args, tc) => {
      const systemId = await ownedSystem(tc, args.systemId);
      const frozen = await tc.workflow.runs.snapshot(systemId);
      return { id: systemId, name: frozen.systemName, latestVersion: frozen.versionName, ...frozen.snapshot };
    }
  },
  {
    name: "start_run",
    title: "Start a run",
    description:
      "Start running a workflow. Returns the first step to do. Then loop: do the step, call complete_step, and follow the next step it returns until the run is completed.",
    capability: "runs:write",
    inputSchema: obj({ systemId: str("The workflow id."), input: { description: "Optional input for the run, for example the ticket or task being handled." } }, ["systemId"]),
    handler: async (args, tc) => {
      const systemId = await ownedSystem(tc, args.systemId);
      const run = await tc.workflow.runs.start(tc.ctx, { systemId, trigger: "mcp", input: args.input });
      return tc.workflow.currentStepWithConnections(tc.ctx, run.id, { withSecrets: hasCapability(tc.ctx.capabilities, "connections:secrets") });
    }
  },
  {
    name: "get_current_step",
    title: "Get the current step",
    description: "Get the step a run is on now: its instructions, how to tell it is done, skills and connections to use, and the routes out of it.",
    capability: "runs:read",
    inputSchema: obj({ runId: str("The run id.") }, ["runId"]),
    annotations: { readOnlyHint: true },
    handler: async (args, tc) => {
      const run = await ownedRun(tc, args.runId);
      return tc.workflow.currentStepWithConnections(tc.ctx, run.id, { withSecrets: hasCapability(tc.ctx.capabilities, "connections:secrets") });
    }
  },
  {
    name: "complete_step",
    title: "Complete the current step",
    description:
      'Report the result of the current step. outcome is "success", "failure", "retry", or the label of a route. When a step has several routes, pass the route label as outcome or a pipe id as next. Returns the next step.',
    capability: "runs:write",
    inputSchema: obj(
      {
        runId: str("The run id."),
        nodeId: str("The id of the step you are completing. Guards against completing the wrong step."),
        outcome: str('success, failure, retry, or a route label. Defaults to success.'),
        output: { description: "What the step produced. Later steps receive it." },
        notes: str("Anything a person reviewing the run should know."),
        next: str("A pipe id (or target step id) to take when there are several routes.")
      },
      ["runId"]
    ),
    handler: async (args, tc) => {
      const run = await ownedRun(tc, args.runId);
      await tc.workflow.runs.complete(tc.ctx, run.id, { nodeId: args.nodeId, outcome: args.outcome, output: args.output, notes: args.notes, next: args.next });
      return tc.workflow.currentStepWithConnections(tc.ctx, run.id, { withSecrets: hasCapability(tc.ctx.capabilities, "connections:secrets") });
    }
  },
  {
    name: "get_run",
    title: "Get a run",
    description: "Get a run's status and the full record of steps taken so far.",
    capability: "runs:read",
    inputSchema: obj({ runId: str("The run id.") }, ["runId"]),
    annotations: { readOnlyHint: true },
    handler: async (args, tc) => {
      const run = await ownedRun(tc, args.runId);
      const { snapshot: _snapshot, ...rest } = run;
      return rest;
    }
  },
  {
    name: "list_runs",
    title: "List runs",
    description: "List recent runs, optionally for one workflow or with one status (running, waiting_approval, completed, failed, canceled).",
    capability: "runs:read",
    inputSchema: obj({ systemId: str("Only runs of this workflow."), status: str("Only runs with this status.") }),
    annotations: { readOnlyHint: true },
    handler: async (args, tc) => {
      const runs = args.systemId ? await tc.workflow.runs.listForSystem(tc.ctx, await ownedSystem(tc, args.systemId)) : await tc.workflow.runs.listForWorkspace(tc.ctx, { status: args.status });
      return runs.filter((r) => (!args.status || r.status === args.status) && (!tc.ctx.systemScope || r.systemId === tc.ctx.systemScope)).slice(0, 50);
    }
  },
  {
    name: "cancel_run",
    title: "Cancel a run",
    description: "Stop a run that should not continue.",
    capability: "runs:write",
    inputSchema: obj({ runId: str("The run id."), reason: str("Why it was canceled.") }, ["runId"]),
    annotations: { destructiveHint: true },
    handler: async (args, tc) => {
      const run = await ownedRun(tc, args.runId);
      const canceled = await tc.workflow.runs.cancel(tc.ctx, run.id, args.reason);
      return { runId: canceled.id, status: canceled.status };
    }
  },
  {
    name: "list_templates",
    title: "List templates",
    description: "List starter workflow templates.",
    capability: "templates:read",
    inputSchema: obj({}),
    annotations: { readOnlyHint: true },
    handler: async (_args, tc) => tc.services.templates.list()
  },
  {
    name: "create_workflow_from_template",
    title: "Create a workflow from a template",
    description: "Create a new workflow from a template id returned by list_templates.",
    capability: "templates:instantiate",
    inputSchema: obj({ templateId: str("The template id."), name: str("Name for the new workflow.") }, ["templateId"]),
    handler: async (args, tc) => tc.services.templates.instantiate(tc.ctx, String(args.templateId), args.name)
  },
  {
    name: "export_workflow",
    title: "Export a workflow",
    description: "Export a workflow as a portable pipes_schema_v1 document.",
    capability: "schema:read",
    inputSchema: obj({ systemId: str("The workflow id.") }, ["systemId"]),
    annotations: { readOnlyHint: true },
    handler: async (args, tc) => tc.services.schema.export(tc.ctx, await ownedSystem(tc, args.systemId))
  },
  {
    name: "add_comment",
    title: "Comment on a workflow",
    description: "Leave a comment on a workflow, optionally on one step, for the people who own it.",
    capability: "comments:write",
    inputSchema: obj({ systemId: str("The workflow id."), body: str("The comment."), nodeId: str("The step it is about.") }, ["systemId", "body"]),
    handler: async (args, tc) => {
      const systemId = await ownedSystem(tc, args.systemId);
      await tc.services.comments.add(tc.ctx, { systemId, body: String(args.body), nodeId: args.nodeId });
      return { ok: true };
    }
  }
];

export function toolDescriptors() {
  return MCP_TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations }));
}
