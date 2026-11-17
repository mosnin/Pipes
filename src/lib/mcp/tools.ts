import { publicFact } from "@/domain/memory/service";
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
    inputSchema: obj(
      {
        systemId: str("The workflow id."),
        input: { description: "Optional input for the run, for example the ticket or task being handled." },
        idempotencyKey: str("Optional. Any unique string for this start. If you retry with the same key, you get the same run back instead of a second one.")
      },
      ["systemId"]
    ),
    handler: async (args, tc) => {
      const systemId = await ownedSystem(tc, args.systemId);
      const run = await tc.workflow.runs.start(tc.ctx, { systemId, trigger: "mcp", input: args.input, idempotencyKey: args.idempotencyKey ? `mcp:${tc.ctx.actorId}:${args.idempotencyKey}` : undefined });
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
        next: str("A pipe id (or target step id) to take when there are several routes."),
        idempotencyKey: str("Optional. A unique string for this completion. A retry with the same key is recognised and never completes a second step."),
        costMicros: { type: "integer", minimum: 0, description: "Optional. What this step cost you, in micro-dollars (1,000,000 = $1). Counts toward the run's cost limit." },
        remember: {
          type: "array",
          maxItems: 10,
          description: "Optional. Facts worth knowing on later runs of this workflow, one per item: a string, or { text, key?, scope? }. A fact with the key of an existing one replaces it. Needs memory:write; never put secrets here.",
          items: { anyOf: [{ type: "string" }, { type: "object", properties: { text: { type: "string" }, key: { type: "string" }, scope: { type: "string", enum: ["workflow", "workspace"] } }, required: ["text"] }] }
        }
      },
      ["runId"]
    ),
    handler: async (args, tc) => {
      const run = await ownedRun(tc, args.runId);
      const remember = Array.isArray(args.remember) && args.remember.length ? args.remember : undefined;
      if (remember && tc.ctx.actorType === "agent" && !hasCapability(tc.ctx.capabilities, "memory:write")) throw new ProtocolError("PERMISSION_DENIED", "This token is missing the memory:write capability, so it cannot pass remember. Complete the step without it.", 403);
      const { remembered } = await tc.workflow.completeStep(tc.ctx, run.id, { remember, nodeId: args.nodeId, outcome: args.outcome, output: args.output, notes: args.notes, next: args.next, idempotencyKey: args.idempotencyKey, costMicros: typeof args.costMicros === "number" ? args.costMicros : undefined });
      const next = await tc.workflow.currentStepWithConnections(tc.ctx, run.id, { withSecrets: hasCapability(tc.ctx.capabilities, "connections:secrets") });
      return remembered.length ? { ...next, remembered } : next;
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
    name: "get_run_events",
    title: "Get a run's journal",
    description: "Get a run's journal: every change to the run in order, with who made it and when. Use afterSeq to read only what happened since you last looked, for example after reconnecting.",
    capability: "runs:read",
    inputSchema: obj({ runId: str("The run id."), afterSeq: { type: "integer", minimum: 0, description: "Only events after this sequence number." } }, ["runId"]),
    annotations: { readOnlyHint: true },
    handler: async (args, tc) => {
      const run = await ownedRun(tc, args.runId);
      const events = await tc.workflow.runs.events(tc.ctx, run.id, Number(args.afterSeq ?? 0));
      return { runId: run.id, rev: run.rev ?? 0, events: events.slice(0, 200) };
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
    name: "search_memory",
    title: "Search workflow memory",
    description: "Find facts this workflow (and the workspace) has learned on earlier runs: customer preferences, quirks of a tool, decisions already made. get_current_step already includes the facts that match the step; search when you need something else. Facts that were replaced or forgotten are not returned.",
    capability: "memory:read",
    inputSchema: obj({ systemId: str("The workflow id. Omit for workspace-wide facts only."), query: str("What you want to know, in a few words. Omit for the newest facts."), limit: { type: "integer", minimum: 1, maximum: 50, description: "Default 10." } }),
    annotations: { readOnlyHint: true },
    handler: async (args, tc) => {
      const systemId = args.systemId ? await ownedSystem(tc, args.systemId) : tc.ctx.systemScope ?? undefined;
      const facts = await tc.workflow.memory.search(tc.ctx, { systemId, query: typeof args.query === "string" ? args.query : undefined, limit: typeof args.limit === "number" ? args.limit : undefined });
      return { facts: facts.map(publicFact) };
    }
  },
  {
    name: "remember",
    title: "Remember a fact",
    description: "Store one fact for later runs of a workflow, outside of completing a step. One sentence, one thing, true beyond this run (\"Acme wants invoices in EUR\", not \"I am on step 3\"). Give related facts the same key so a newer one replaces the older one. Never store secrets; connections hold those.",
    capability: "memory:write",
    inputSchema: obj({ systemId: str("The workflow the fact belongs to. Omit for a workspace-wide fact."), text: str("The fact, one sentence."), key: str("Optional. A short name for what the fact is about, such as acme-invoice-currency."), runId: str("Optional. The run that taught you this, for provenance.") }, ["text"]),
    handler: async (args, tc) => {
      const systemId = args.systemId ? await ownedSystem(tc, args.systemId) : undefined;
      const run = args.runId ? await ownedRun(tc, args.runId) : undefined;
      const result = await tc.workflow.memory.remember(tc.ctx, { systemId, text: args.text, key: args.key, source: { type: tc.ctx.actorType === "agent" ? "agent" : "person", actorId: tc.ctx.actorId, runId: run?.id } });
      return { fact: publicFact(result.fact), duplicate: result.duplicate, replaced: result.replaced ? publicFact(result.replaced) : undefined };
    }
  },
  {
    name: "forget_memory",
    title: "Forget a fact",
    description: "Mark a fact as no longer true, with a reason. It stops appearing in steps and searches but stays in the workflow's memory history. To correct a fact, remember the new one with the same key instead.",
    capability: "memory:write",
    inputSchema: obj({ factId: str("The fact id, from search_memory or get_current_step."), reason: str("Why it no longer holds.") }, ["factId"]),
    annotations: { destructiveHint: true, idempotentHint: true },
    handler: async (args, tc) => {
      const fact = await tc.workflow.memory.get(tc.ctx, String(args.factId ?? ""));
      if (!fact) throw new RunError("bad_request", "No fact with that id.");
      if (fact.systemId) scope(tc, fact.systemId);
      return { fact: publicFact(await tc.workflow.memory.forget(tc.ctx, fact.id, args.reason)) };
    }
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
