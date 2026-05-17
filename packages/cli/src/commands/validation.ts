import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { makeClient } from "../client.js";
import { printJson, printError } from "../output.js";

interface ValidationError {
  type: string;
  nodeId?: string;
  pipeId?: string;
  message: string;
}

interface ValidationReport {
  nodeCount: number;
  pipeCount: number;
  warnings: ValidationError[];
  errors: ValidationError[];
}

interface GlobalOpts {
  api?: string;
  token?: string;
  json?: boolean;
}

export function registerValidation(program: Command): void {
  program
    .command("validate <systemId>")
    .description("Get validation report for a system")
    .action(async (systemId: string) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const client = makeClient({ api: global.api, token: global.token });
      const spinner = ora("Validating...").start();
      try {
        const data = await client.get<ValidationReport>(
          `/api/protocol/systems/${systemId}/validation`
        );
        spinner.stop();
        if (global.json) {
          printJson(data);
          return;
        }

        console.log(`Nodes: ${data.nodeCount}   Pipes: ${data.pipeCount}`);
        console.log();

        if (data.errors.length === 0 && data.warnings.length === 0) {
          console.log(chalk.green("✓ No issues found"));
          return;
        }

        if (data.errors.length > 0) {
          console.log(chalk.red(`Errors (${data.errors.length}):`));
          for (const e of data.errors) {
            const loc = e.nodeId ? ` [node: ${e.nodeId}]` : e.pipeId ? ` [pipe: ${e.pipeId}]` : "";
            console.log(chalk.red(`  ✗ ${e.message}${loc}`));
          }
          console.log();
        }

        if (data.warnings.length > 0) {
          console.log(chalk.yellow(`Warnings (${data.warnings.length}):`));
          for (const w of data.warnings) {
            const loc = w.nodeId ? ` [node: ${w.nodeId}]` : w.pipeId ? ` [pipe: ${w.pipeId}]` : "";
            console.log(chalk.yellow(`  ! ${w.message}${loc}`));
          }
        }
      } catch (err) {
        spinner.stop();
        printError(err);
      }
    });
}
