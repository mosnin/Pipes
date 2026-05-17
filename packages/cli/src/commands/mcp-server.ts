import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { makeClient } from "../client.js";

interface GlobalOpts {
  api?: string;
  token?: string;
}

interface McpServerOpts {
  api?: string;
  token?: string;
}

const TOOLS = [
  {
    name: "list_systems",
    description: "List all systems in the workspace. Requires systems:read capability.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_system",
    description: "Get metadata for a system. Requires systems:read capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string" },
      },
      required: ["systemId"],
    },
  },
  {
    name: "create_system",
    description: "Create a new system. Requires systems:write capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_graph",
    description:
      "Get the current nodes and pipes in a system. Requires schema:read capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string" },
      },
      required: ["systemId"],
    },
  },
  {
    name: "export_schema",
    description:
      "Export a system as full pipes_schema_v1 JSON. Requires schema:read capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string" },
      },
      required: ["systemId"],
    },
  },
  {
    name: "import_schema",
    description:
      "Import a pipes_schema_v1 JSON object as a new system. Requires import:write capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        schema: { type: "object" },
        name: { type: "string" },
      },
      required: ["schema"],
    },
  },
  {
    name: "apply_graph_actions",
    description:
      "Apply one or more graph mutations (addNode, addPipe, deleteNode, deletePipe, updateNode). Requires graph:write capability. Pass an array of action objects.",
    inputSchema: {
      type: "object" as const,
      properties: {
        actions: {
          type: "array",
          items: { type: "object" },
        },
      },
      required: ["actions"],
    },
  },
  {
    name: "list_versions",
    description:
      "List all version snapshots of a system. Requires versions:read capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string" },
      },
      required: ["systemId"],
    },
  },
  {
    name: "create_version",
    description:
      "Create a named version snapshot of a system. Requires versions:write capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string" },
        name: { type: "string" },
      },
      required: ["systemId"],
    },
  },
  {
    name: "get_validation_report",
    description:
      "Get validation report for a system (errors, warnings, node/pipe counts). Requires validation:read capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string" },
      },
      required: ["systemId"],
    },
  },
  {
    name: "list_templates",
    description: "List available starter templates. Requires templates:read capability.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "instantiate_template",
    description:
      "Create a new system from a template. Requires templates:instantiate capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        templateId: { type: "string" },
        name: { type: "string" },
      },
      required: ["templateId"],
    },
  },
  {
    name: "add_comment",
    description:
      "Add a comment to a system or node. Requires comments:write capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        systemId: { type: "string" },
        body: { type: "string" },
        nodeId: { type: "string" },
      },
      required: ["systemId", "body"],
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
    .action(async (opts: McpServerOpts) => {
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
