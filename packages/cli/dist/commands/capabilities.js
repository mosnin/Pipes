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
            command: "validation get <systemId>",
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
};
export function registerCapabilities(program) {
    program
        .command("capabilities")
        .description("Print machine-readable manifest of all CLI commands and required capabilities")
        .action(() => {
        console.log(JSON.stringify(MANIFEST, null, 2));
    });
}
