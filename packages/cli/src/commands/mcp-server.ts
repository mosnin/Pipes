import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { makeClient } from "../client.js";
import { extractMetadata, scoreRecord, compressForContext, embedQuery } from "../memory/extract.js";
import { searchEmbeddings } from "../memory/vector-store.js";
import type { MemoryRecord } from "../memory/types.js";

interface GlobalOpts {
  api?: string;
  token?: string;
}

const TOOLS = [
  {
    name: "list_systems",
    description: "List all systems in the workspace.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_system",
    description: "Get name, description, node count, and pipe count for a system.",
    inputSchema: {
      type: "object" as const,
      properties: { systemId: { type: "string", description: "System ID" } },
      required: ["systemId"],
    },
  },
  {
    name: "create_system",
    description: "Create a new empty system and return its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "System name" },
        description: { type: "string", description: "Optional description" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_graph",
    description: "Get the current nodes and pipes in a system.",
    inputSchema: {
      type: "object" as const,
      properties: { systemId: { type: "string", description: "System ID" } },
      required: ["systemId"],
    },
  },
  {
    name: "export_schema",
    description: "Export a system as full pipes_schema_v1 JSON.",
    inputSchema: {
      type: "object" as const,
      properties: { systemId: { type: "string", description: "System ID" } },
      required: ["systemId"],
    },
  },
  {
    name: "import_schema",
    description: "Import a pipes_schema_v1 JSON object as a new system and return its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        schema: { type: "object", description: "pipes_schema_v1 JSON object" },
        name: { type: "string", description: "Override system name from schema" },
      },
      required: ["schema"],
    },
  },
  {
    name: "apply_graph_actions",
    description:
      'Apply one or more graph mutations in a single atomic batch. Each action is an object with an "action" key. Supported actions: addNode (fields: systemId, type, title, x, y), addPipe (fields: systemId, fromNodeId, toNodeId), updateNode (fields: nodeId, title?, description?), deleteNode (fields: nodeId), deletePipe (fields: pipeId). Valid node types: Agent, Tool, Model, Prompt, Memory, Input, Output, Action, Decision, Condition, Router, Loop, Queue, Datastore, ExternalApi, HumanApproval, Guardrail, Monitor, Trigger, Schedule, Environment, Subsystem, Reference, Annotation.',
    inputSchema: {
      type: "object" as const,
      properties: {
        actions: {
          type: "array",
          items: { type: "object" },
          description: "Array of action objects",
        },
      },
      required: ["actions"],
    },
  },
  {
    name: "list_versions",
    description: "List all named version snapshots of a system.",
    inputSchema: {
      type: "object" as const,
      properties: { systemId: { type: "string", description: "System ID" } },
      required: ["systemId"],
    },
  },
  {
    name: "create_version",
    description: "Create a named snapshot of a system's current graph state.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string", description: "System ID" },
        name: { type: "string", description: "Version name" },
      },
      required: ["systemId"],
    },
  },
  {
    name: "get_validation_report",
    description:
      "Get a validation report for a system, including node/pipe counts, errors, and warnings.",
    inputSchema: {
      type: "object" as const,
      properties: { systemId: { type: "string", description: "System ID" } },
      required: ["systemId"],
    },
  },
  {
    name: "list_templates",
    description: "List available starter templates for creating pre-built systems.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "instantiate_template",
    description: "Create a new system pre-populated from a starter template.",
    inputSchema: {
      type: "object" as const,
      properties: {
        templateId: { type: "string", description: "Template ID (from list_templates)" },
        name: { type: "string", description: "System name" },
      },
      required: ["templateId"],
    },
  },
  {
    name: "add_comment",
    description: "Add a comment to a system or to a specific node within a system.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string", description: "System ID" },
        body: { type: "string", description: "Comment text" },
        nodeId: { type: "string", description: "Node ID to attach the comment to (optional)" },
      },
      required: ["systemId", "body"],
    },
  },
  {
    name: "memory_store",
    description: "Store a piece of content as a structured memory record. Calls OpenAI to extract metadata (title, type, topic, tags, summary, confidence, importance) then saves it as a Memory node in the specified Pipes system. Requires OPENAI_API_KEY env var.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: { type: "string", description: "The content to store" },
        systemId: { type: "string", description: "Memory system ID (overrides PIPES_MEMORY_SYSTEM env var)" },
        content_type: { type: "string", description: "Optional type hint: note, decision, fact, task, summary, reference, code, conversation" },
        topic: { type: "string", description: "Optional topic hint" },
      },
      required: ["content"],
    },
  },
  {
    name: "memory_search",
    description: "Search memory records using keyword matching and metadata filters. Returns scored results ranked by relevance, confidence, importance, and freshness.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query — split into keywords for matching" },
        systemId: { type: "string", description: "Memory system ID (overrides PIPES_MEMORY_SYSTEM env var)" },
        content_type: { type: "string", description: "Filter by content type" },
        status: { type: "string", description: "Filter by status (default: excludes archived)" },
        limit: { type: "number", description: "Max results to return (default: 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_get_context",
    description: "Retrieve the most relevant memory records for a context and return them compressed for prompt injection. Use this to inject relevant memory into an agent prompt efficiently.",
    inputSchema: {
      type: "object" as const,
      properties: {
        context: { type: "string", description: "Current context, question, or task to retrieve memory for" },
        systemId: { type: "string", description: "Memory system ID (overrides PIPES_MEMORY_SYSTEM env var)" },
        max_chars: { type: "number", description: "Approximate character budget for the returned context (default: 4000)" },
        limit: { type: "number", description: "Max records to consider before compressing (default: 10)" },
      },
      required: ["context"],
    },
  },
];

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function okResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerMcpServer(program: Command): void {
  program
    .command("mcp-server")
    .description(
      "Start a stdio MCP server exposing all Pipes operations as tools"
    )
    .option("--api <url>", "Pipes API base URL")
    .option("--token <token>", "Agent token")
    .action(async (opts: GlobalOpts) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const api = opts.api ?? global.api;
      const token = opts.token ?? global.token;
      const client = makeClient({ api, token });

      const server = new Server(
        { name: "@pipes/cli", version: "0.1.0" },
        { capabilities: { tools: {} } }
      );

      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS,
      }));

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args = {} } = request.params;
        const a = args as Record<string, unknown>;
        const memorySystemId = (a["systemId"] as string | undefined) ?? process.env["PIPES_MEMORY_SYSTEM"];

        try {
          switch (name) {
            case "list_systems": {
              const data = await client.get("/api/protocol/systems");
              return okResult(data);
            }

            case "get_system": {
              const data = await client.get(
                `/api/protocol/systems/${a["systemId"]}`
              );
              return okResult(data);
            }

            case "create_system": {
              const res = await client.postRaw(
                "/api/protocol/systems",
                { name: a["name"], description: a["description"] },
                { idempotencyKey: randomUUID() }
              );
              const d = res.data as { systemId: string } | undefined;
              return okResult({ systemId: d?.systemId, replayed: res.replayed });
            }

            case "get_graph": {
              const res = await client.getRaw(
                `/api/protocol/systems/${a["systemId"]}/schema`
              );
              const d = res.data as
                | { nodes?: unknown; pipes?: unknown }
                | undefined;
              return okResult({ nodes: d?.nodes, pipes: d?.pipes });
            }

            case "export_schema": {
              const res = await client.getRaw(
                `/api/protocol/systems/${a["systemId"]}/schema`
              );
              return okResult(res.data);
            }

            case "import_schema": {
              const res = await client.postRaw(
                "/api/protocol/import/system",
                { schema: a["schema"], name: a["name"] },
                { idempotencyKey: randomUUID() }
              );
              return okResult(res.data);
            }

            case "apply_graph_actions": {
              const res = await client.postRaw(
                "/api/protocol/graph",
                { actions: a["actions"] },
                { idempotencyKey: randomUUID() }
              );
              const d = res.data as
                | { results?: unknown; count?: unknown }
                | undefined;
              return okResult({ results: d?.results, count: d?.count });
            }

            case "list_versions": {
              const data = await client.get(
                `/api/protocol/systems/${a["systemId"]}/versions`
              );
              return okResult(data);
            }

            case "create_version": {
              const res = await client.postRaw(
                `/api/protocol/systems/${a["systemId"]}/versions`,
                { name: a["name"] },
                { idempotencyKey: randomUUID() }
              );
              return okResult(res.data);
            }

            case "get_validation_report": {
              const data = await client.get(
                `/api/protocol/systems/${a["systemId"]}/validation`
              );
              return okResult(data);
            }

            case "list_templates": {
              const data = await client.get("/api/protocol/templates");
              return okResult(data);
            }

            case "instantiate_template": {
              const res = await client.postRaw(
                `/api/protocol/templates/${a["templateId"]}/instantiate`,
                { name: a["name"] },
                { idempotencyKey: randomUUID() }
              );
              return okResult(res.data);
            }

            case "add_comment": {
              const res = await client.postRaw(
                "/api/protocol/comments",
                {
                  systemId: a["systemId"],
                  body: a["body"],
                  nodeId: a["nodeId"],
                },
                { idempotencyKey: randomUUID() }
              );
              return okResult(res.data);
            }

            case "memory_store": {
              const sysId = (a["systemId"] as string | undefined) ?? process.env["PIPES_MEMORY_SYSTEM"];
              if (!sysId) {
                return errorResult("No memory system ID. Pass systemId or set PIPES_MEMORY_SYSTEM env var.");
              }
              const content = a["content"] as string;
              const record = await extractMetadata(content, {
                content_type: a["content_type"] as string | undefined,
                topic: a["topic"] as string | undefined,
              });
              const res = await client.postRaw(
                "/api/protocol/graph",
                {
                  action: "addNode",
                  systemId: sysId,
                  type: "Memory",
                  title: record.title,
                  description: JSON.stringify(record),
                  x: 0,
                  y: 0,
                },
                { idempotencyKey: record.content_id }
              );
              const d = res.data as { result?: string } | undefined;
              return okResult({ nodeId: d?.result, contentId: record.content_id, title: record.title, content_type: record.content_type, topic: record.topic });
            }

            case "memory_search": {
              const sysId = (a["systemId"] as string | undefined) ?? process.env["PIPES_MEMORY_SYSTEM"];
              if (!sysId) {
                return errorResult("No memory system ID. Pass systemId or set PIPES_MEMORY_SYSTEM env var.");
              }
              const schemaRes = await client.getRaw(`/api/protocol/systems/${sysId}/schema`);
              const schemaData = schemaRes.data as { nodes?: Array<{ id: string; type: string; description?: string }> } | undefined;
              const nodes = (schemaData?.nodes ?? []).filter((n) => n.type === "Memory");
              const records: Array<{ nodeId: string; record: MemoryRecord }> = [];
              for (const node of nodes) {
                try {
                  if (!node.description) continue;
                  const r = JSON.parse(node.description) as MemoryRecord;
                  if (!r.content_id) r.content_id = node.id;
                  const filterType = a["content_type"] as string | undefined;
                  const filterStatus = a["status"] as string | undefined;
                  if (filterType && r.content_type !== filterType) continue;
                  if (filterStatus ? r.status !== filterStatus : r.status === "archived") continue;
                  records.push({ nodeId: node.id, record: r });
                } catch { continue; }
              }
              const query = a["query"] as string;
              const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
              const limit = (a["limit"] as number | undefined) ?? 5;
              // Build vector score map from semantic search
              const vectorScores = new Map<string, number>();
              const queryVector = await embedQuery(query);
              if (queryVector) {
                const matches = searchEmbeddings(queryVector, limit * 3);
                const maxDist = Math.max(...matches.map(m => m.distance), 1);
                for (const m of matches) {
                  vectorScores.set(m.content_id, 1 - m.distance / maxDist);
                }
              }
              const scored = records
                .map(({ nodeId, record }) => ({ nodeId, record, score: scoreRecord(record, keywords, vectorScores.get(record.content_id) ?? 0) }))
                .sort((x, y) => y.score - x.score)
                .slice(0, limit);
              return okResult(scored.map(({ nodeId, record, score }) => ({
                nodeId, score: Math.round(score * 100) / 100,
                title: record.title, content_type: record.content_type,
                topic: record.topic, status: record.status, summary: record.summary,
              })));
            }

            case "memory_get_context": {
              const sysId = (a["systemId"] as string | undefined) ?? process.env["PIPES_MEMORY_SYSTEM"];
              if (!sysId) {
                return errorResult("No memory system ID. Pass systemId or set PIPES_MEMORY_SYSTEM env var.");
              }
              const schemaRes = await client.getRaw(`/api/protocol/systems/${sysId}/schema`);
              const schemaData = schemaRes.data as { nodes?: Array<{ id: string; type: string; description?: string }> } | undefined;
              const nodes = (schemaData?.nodes ?? []).filter((n) => n.type === "Memory");
              const records: MemoryRecord[] = [];
              for (const node of nodes) {
                try {
                  if (!node.description) continue;
                  const r = JSON.parse(node.description) as MemoryRecord;
                  if (r.status === "archived") continue;
                  records.push(r);
                } catch { continue; }
              }
              const context = a["context"] as string;
              const keywords = context.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
              const limit = (a["limit"] as number | undefined) ?? 10;
              const maxChars = (a["max_chars"] as number | undefined) ?? 4000;
              // Build vector score map from semantic search
              const ctxVectorScores = new Map<string, number>();
              const ctxQueryVector = await embedQuery(context);
              if (ctxQueryVector) {
                const matches = searchEmbeddings(ctxQueryVector, limit * 3);
                const maxDist = Math.max(...matches.map(m => m.distance), 1);
                for (const m of matches) {
                  ctxVectorScores.set(m.content_id, 1 - m.distance / maxDist);
                }
              }
              const topRecords = records
                .map((r) => ({ record: r, score: scoreRecord(r, keywords, ctxVectorScores.get(r.content_id) ?? 0) }))
                .sort((x, y) => y.score - x.score)
                .slice(0, limit)
                .map(({ record }) => record);
              const compressed = compressForContext(topRecords, maxChars);
              return okResult({ context: compressed, record_count: topRecords.length });
            }

            default:
              return errorResult(`Unknown tool: ${name}`);
          }
        } catch (err) {
          return errorResult(err);
        }
      });

      const transport = new StdioServerTransport();
      process.stderr.write("Pipes MCP server running (stdio)\n");
      await server.connect(transport);
    });
}
