import { Command } from "commander";

const MANIFEST = {
  cli: "@pipes/cli",
  version: "0.1.0",
  api_version: "pipes_schema_v1",
  api_base: "/api/protocol",
  commands: [
    {
      command: "init",
      description: "Create .pipes.yml config file in the current directory",
      required_capability: null,
      options: [
        { flag: "--api <url>", description: "Pipes API URL" },
        { flag: "--token <token>", description: "Agent token" },
      ],
    },
    {
      command: "capabilities",
      description: "Print machine-readable manifest of all CLI commands",
      required_capability: null,
      options: [],
    },
    {
      command: "systems list",
      description: "List all systems in the workspace",
      required_capability: "systems:read",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "systems get <systemId>",
      description: "Get metadata for a system",
      required_capability: "systems:read",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "systems create <name>",
      description: "Create a new system",
      required_capability: "systems:write",
      options: [
        { flag: "--description <desc>", description: "System description" },
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "schema export <systemId>",
      description: "Export system as pipes_schema_v1 JSON (streamed)",
      required_capability: "schema:read",
      options: [
        { flag: "--out <file>", description: "Write output to a file instead of stdout" },
      ],
    },
    {
      command: "schema import <file>",
      description: "Import a pipes_schema_v1 JSON file as a new system",
      required_capability: "import:write",
      options: [
        { flag: "--name <name>", description: "Override system name from schema" },
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "versions list <systemId>",
      description: "List all versions of a system",
      required_capability: "versions:read",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "versions create <systemId>",
      description: "Create a named version snapshot",
      required_capability: "versions:write",
      options: [
        { flag: "--name <name>", description: "Version name" },
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "graph add-node <systemId>",
      description: "Add a node to a system graph",
      required_capability: "graph:write",
      options: [
        { flag: "--type <type>", description: "Node type (e.g. Agent, Tool, Memory)" },
        { flag: "--title <title>", description: "Node title" },
        { flag: "--description <desc>", description: "Node description" },
        { flag: "--x <x>", description: "X position (default: 0)" },
        { flag: "--y <y>", description: "Y position (default: 0)" },
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "graph add-pipe <systemId>",
      description: "Add a pipe (edge) between two nodes",
      required_capability: "graph:write",
      options: [
        { flag: "--from <nodeId>", description: "Source node ID" },
        { flag: "--to <nodeId>", description: "Target node ID" },
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "graph get <systemId>",
      description: "Display nodes and pipes for a system graph",
      required_capability: "schema:read",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "graph delete-node <nodeId>",
      description: "Delete a node from a system graph",
      required_capability: "graph:write",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "graph delete-pipe <pipeId>",
      description: "Delete a pipe from a system graph",
      required_capability: "graph:write",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "graph apply [file]",
      description: "Apply a batch of graph actions from a JSON file or stdin",
      required_capability: "graph:write",
      options: [
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "validate <systemId>",
      description: "Get validation report for a system",
      required_capability: "validation:read",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "templates list",
      description: "List available starter templates",
      required_capability: "templates:read",
      options: [{ flag: "--json", description: "Output raw JSON" }],
    },
    {
      command: "templates instantiate <templateId>",
      description: "Create a new system from a template",
      required_capability: "templates:instantiate",
      options: [
        { flag: "--name <name>", description: "System name" },
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "mcp-server",
      description: "Start a stdio MCP server exposing all Pipes operations as MCP tools",
      required_capability: null,
      options: [
        { flag: "--api <url>", description: "Pipes API base URL" },
        { flag: "--token <token>", description: "Agent token" },
      ],
    },
    {
      command: "memory add <content>",
      description: "Store content as a structured memory record (extracts metadata via OpenAI)",
      required_capability: "graph:write",
      options: [
        { flag: "--system <id>", description: "Memory system ID (overrides PIPES_MEMORY_SYSTEM)" },
        { flag: "--type <type>", description: "Content type hint: note, decision, fact, task, summary, reference, code, conversation" },
        { flag: "--topic <topic>", description: "Topic hint for extraction" },
        { flag: "--no-extract", description: "Skip LLM extraction, store with minimal metadata" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "memory search <query>",
      description: "Search memory records by keyword relevance, filtered by type/status, ranked by score",
      required_capability: "schema:read",
      options: [
        { flag: "--system <id>", description: "Memory system ID" },
        { flag: "--type <type>", description: "Filter by content type" },
        { flag: "--status <status>", description: "Filter by status (default: excludes archived)" },
        { flag: "--limit <n>", description: "Max results (default: 5)" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "memory list",
      description: "List all memory records in a system, optionally filtered",
      required_capability: "schema:read",
      options: [
        { flag: "--system <id>", description: "Memory system ID" },
        { flag: "--type <type>", description: "Filter by content type" },
        { flag: "--status <status>", description: "Filter by status" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "memory get <nodeId>",
      description: "Get a specific memory record by its node ID",
      required_capability: "schema:read",
      options: [
        { flag: "--system <id>", description: "Memory system ID" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "memory link <fromId> <toId>",
      description: "Link two memory records with a typed relation (supports, contradicts, derives-from, supersedes, references)",
      required_capability: "graph:write",
      options: [
        { flag: "--system <id>", description: "Memory system ID" },
        { flag: "--rel <relation>", description: "Relation type (required)" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "memory traverse <nodeId>",
      description: "Traverse the memory graph from a node, following typed relations up to N hops",
      required_capability: "schema:read",
      options: [
        { flag: "--system <id>", description: "Memory system ID" },
        { flag: "--depth <n>", description: "Max hops (default: 2)" },
        { flag: "--rel <relation>", description: "Filter by relation type" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
    {
      command: "comments add <systemId>",
      description: "Add a comment to a system or node",
      required_capability: "comments:write",
      options: [
        { flag: "--body <body>", description: "Comment text" },
        { flag: "--node-id <nodeId>", description: "Attach comment to a specific node" },
        { flag: "--idempotency-key <key>", description: "Idempotency key for safe retries" },
        { flag: "--json", description: "Output raw JSON" },
      ],
    },
  ],
} as const;

export function registerCapabilities(program: Command): void {
  program
    .command("capabilities")
    .description("Print machine-readable manifest of all CLI commands and required capabilities")
    .action(() => {
      console.log(JSON.stringify(MANIFEST, null, 2));
    });
}
