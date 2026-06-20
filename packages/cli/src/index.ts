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
import { registerCompletion } from "./commands/completion.js";
import { initTelemetry } from "./telemetry.js";
import { initAuditLog } from "./audit.js";

initTelemetry();

const program = new Command("looper")
  .description("CLI for Looper — build and manage agent systems from your terminal")
  .version("0.1.0")
  .option("--api <url>", "Pipes API base URL (overrides LOOPER_API and .looper.yml)")
  .option("--token <token>", "Agent token (overrides LOOPER_TOKEN and .looper.yml)")
  .option("--json", "Output raw JSON (machine-readable)")
  .option("--strict", "Reject content with detected prompt injection patterns (default: warn only)")
  .option("--audit-log <file>", "Append NDJSON audit entries to a file")
  .addHelpText(
    "after",
    `
Environment variables:
  LOOPER_API     API base URL (default: https://app.looper.dev)
  LOOPER_TOKEN   Agent token

Config file:
  .looper.yml    Searched in the current directory and all parent directories

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

Enable tab completion:
  eval "$(pipes completion --shell bash)"  # bash
  eval "$(pipes completion --shell zsh)"   # zsh
  pipes completion --shell fish > ~/.config/fish/completions/pipes.fish
`
  );

program.hook("preAction", (_thisCommand, _actionCommand) => {
  const opts = program.opts<{ auditLog?: string }>();
  const auditPath = opts.auditLog ?? process.env["LOOPER_AUDIT_LOG"];
  if (auditPath) initAuditLog(auditPath);
});

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
registerCompletion(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
