import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { makeClient } from "../client.js";
const TOOLS = [
    {
        name: "list_systems",
        description: "List all systems in the workspace.",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "get_system",
        description: "Get name, description, node count, and pipe count for a system.",
        inputSchema: {
            type: "object",
            properties: { systemId: { type: "string", description: "System ID" } },
            required: ["systemId"],
        },
    },
    {
        name: "create_system",
        description: "Create a new empty system and return its ID.",
        inputSchema: {
            type: "object",
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
            type: "object",
            properties: { systemId: { type: "string", description: "System ID" } },
            required: ["systemId"],
        },
    },
    {
        name: "export_schema",
        description: "Export a system as full pipes_schema_v1 JSON.",
        inputSchema: {
            type: "object",
            properties: { systemId: { type: "string", description: "System ID" } },
            required: ["systemId"],
        },
    },
    {
        name: "import_schema",
        description: "Import a pipes_schema_v1 JSON object as a new system and return its ID.",
        inputSchema: {
            type: "object",
            properties: {
                schema: { type: "object", description: "pipes_schema_v1 JSON object" },
                name: { type: "string", description: "Override system name from schema" },
            },
            required: ["schema"],
        },
    },
    {
        name: "apply_graph_actions",
        description: 'Apply one or more graph mutations in a single atomic batch. Each action is an object with an "action" key. Supported actions: addNode (fields: systemId, type, title, x, y), addPipe (fields: systemId, fromNodeId, toNodeId), updateNode (fields: nodeId, title?, description?), deleteNode (fields: nodeId), deletePipe (fields: pipeId). Valid node types: Agent, Tool, Model, Prompt, Memory, Input, Output, Action, Decision, Condition, Router, Loop, Queue, Datastore, ExternalApi, HumanApproval, Guardrail, Monitor, Trigger, Schedule, Environment, Subsystem, Reference, Annotation.',
        inputSchema: {
            type: "object",
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
            type: "object",
            properties: { systemId: { type: "string", description: "System ID" } },
            required: ["systemId"],
        },
    },
    {
        name: "create_version",
        description: "Create a named snapshot of a system's current graph state.",
        inputSchema: {
            type: "object",
            properties: {
                systemId: { type: "string", description: "System ID" },
                name: { type: "string", description: "Version name" },
            },
            required: ["systemId"],
        },
    },
    {
        name: "get_validation_report",
        description: "Get a validation report for a system, including node/pipe counts, errors, and warnings.",
        inputSchema: {
            type: "object",
            properties: { systemId: { type: "string", description: "System ID" } },
            required: ["systemId"],
        },
    },
    {
        name: "list_templates",
        description: "List available starter templates for creating pre-built systems.",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "instantiate_template",
        description: "Create a new system pre-populated from a starter template.",
        inputSchema: {
            type: "object",
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
            type: "object",
            properties: {
                systemId: { type: "string", description: "System ID" },
                body: { type: "string", description: "Comment text" },
                nodeId: { type: "string", description: "Node ID to attach the comment to (optional)" },
            },
            required: ["systemId", "body"],
        },
    },
];
function errorResult(err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
        content: [{ type: "text", text: message }],
        isError: true,
    };
}
function okResult(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
export function registerMcpServer(program) {
    program
        .command("mcp-server")
        .description("Start a stdio MCP server exposing all Pipes operations as tools")
        .option("--api <url>", "Pipes API base URL")
        .option("--token <token>", "Agent token")
        .action(async (opts) => {
        const global = program.optsWithGlobals();
        const api = opts.api ?? global.api;
        const token = opts.token ?? global.token;
        const client = makeClient({ api, token });
        const server = new Server({ name: "@pipes/cli", version: "0.1.0" }, { capabilities: { tools: {} } });
        server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: TOOLS,
        }));
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args = {} } = request.params;
            const a = args;
            try {
                switch (name) {
                    case "list_systems": {
                        const data = await client.get("/api/protocol/systems");
                        return okResult(data);
                    }
                    case "get_system": {
                        const data = await client.get(`/api/protocol/systems/${a["systemId"]}`);
                        return okResult(data);
                    }
                    case "create_system": {
                        const res = await client.postRaw("/api/protocol/systems", { name: a["name"], description: a["description"] }, { idempotencyKey: randomUUID() });
                        const d = res.data;
                        return okResult({ systemId: d?.systemId, replayed: res.replayed });
                    }
                    case "get_graph": {
                        const res = await client.getRaw(`/api/protocol/systems/${a["systemId"]}/schema`);
                        const d = res.data;
                        return okResult({ nodes: d?.nodes, pipes: d?.pipes });
                    }
                    case "export_schema": {
                        const res = await client.getRaw(`/api/protocol/systems/${a["systemId"]}/schema`);
                        return okResult(res.data);
                    }
                    case "import_schema": {
                        const res = await client.postRaw("/api/protocol/import/system", { schema: a["schema"], name: a["name"] }, { idempotencyKey: randomUUID() });
                        return okResult(res.data);
                    }
                    case "apply_graph_actions": {
                        const res = await client.postRaw("/api/protocol/graph", { actions: a["actions"] }, { idempotencyKey: randomUUID() });
                        const d = res.data;
                        return okResult({ results: d?.results, count: d?.count });
                    }
                    case "list_versions": {
                        const data = await client.get(`/api/protocol/systems/${a["systemId"]}/versions`);
                        return okResult(data);
                    }
                    case "create_version": {
                        const res = await client.postRaw(`/api/protocol/systems/${a["systemId"]}/versions`, { name: a["name"] }, { idempotencyKey: randomUUID() });
                        return okResult(res.data);
                    }
                    case "get_validation_report": {
                        const data = await client.get(`/api/protocol/systems/${a["systemId"]}/validation`);
                        return okResult(data);
                    }
                    case "list_templates": {
                        const data = await client.get("/api/protocol/templates");
                        return okResult(data);
                    }
                    case "instantiate_template": {
                        const res = await client.postRaw(`/api/protocol/templates/${a["templateId"]}/instantiate`, { name: a["name"] }, { idempotencyKey: randomUUID() });
                        return okResult(res.data);
                    }
                    case "add_comment": {
                        const res = await client.postRaw("/api/protocol/comments", {
                            systemId: a["systemId"],
                            body: a["body"],
                            nodeId: a["nodeId"],
                        }, { idempotencyKey: randomUUID() });
                        return okResult(res.data);
                    }
                    default:
                        return errorResult(`Unknown tool: ${name}`);
                }
            }
            catch (err) {
                return errorResult(err);
            }
        });
        const transport = new StdioServerTransport();
        process.stderr.write("Pipes MCP server running (stdio)\n");
        await server.connect(transport);
    });
}
