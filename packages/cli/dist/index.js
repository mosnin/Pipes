#!/usr/bin/env node
import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerCapabilities } from "./commands/capabilities.js";
import { registerSystems } from "./commands/systems.js";
import { registerSchema } from "./commands/schema.js";
import { registerVersions } from "./commands/versions.js";
import { registerGraph } from "./commands/graph.js";
import { registerValidation } from "./commands/validation.js";
import { registerTemplates } from "./commands/templates.js";
import { registerComments } from "./commands/comments.js";
import { registerMemory } from "./commands/memory.js";
import { registerMcpServer } from "./commands/mcp-server.js";
const program = new Command("pipes")
    .description("CLI for Pipes — build and manage agent systems from your terminal")
    .version("0.1.0")
    .option("--api <url>", "Pipes API base URL (overrides PIPES_API and .pipes.yml)")
    .option("--token <token>", "Agent token (overrides PIPES_TOKEN and .pipes.yml)")
    .option("--json", "Output raw JSON (machine-readable)")
    .addHelpText("after", `
Environment variables:
  PIPES_API     API base URL (default: https://app.pipes.sh)
  PIPES_TOKEN   Agent token

Config file:
  .pipes.yml    Searched in the current directory and all parent directories

Examples:
  pipes init
  pipes systems list
  pipes systems create "My Agent System"
  pipes schema export sys_abc123 --out schema.json
  pipes graph add-node sys_abc123 --type Agent --title "Planner"
  pipes graph apply actions.json
  pipes validate sys_abc123
  pipes capabilities
  pipes mcp-server
`);
registerInit(program);
registerCapabilities(program);
registerSystems(program);
registerSchema(program);
registerVersions(program);
registerGraph(program);
registerValidation(program);
registerTemplates(program);
registerComments(program);
registerMemory(program);
registerMcpServer(program);
program.parseAsync(process.argv).catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
