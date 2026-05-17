import { Command } from "commander";
import { randomUUID } from "node:crypto";
import ora from "ora";
import { makeClient } from "../client.js";
import { printJson, printError, printSuccess } from "../output.js";

interface GlobalOpts {
  api?: string;
  token?: string;
  json?: boolean;
}

export function registerGraph(program: Command): void {
  const graph = program.command("graph").description("Mutate system graphs");

  graph
    .command("add-node <systemId>")
    .description("Add a node to a system graph")
    .option("--type <type>", "Node type (e.g. Agent, Tool, Memory, Trigger)", "Agent")
    .option("--title <title>", "Node title", "New Node")
    .option("--description <desc>", "Node description")
    .option("--x <x>", "X position", "0")
    .option("--y <y>", "Y position", "0")
    .option("--idempotency-key <key>", "Idempotency key for safe retries")
    .action(
      async (
        systemId: string,
        opts: {
          type: string;
          title: string;
          description?: string;
          x: string;
          y: string;
          idempotencyKey?: string;
        }
      ) => {
        const global = program.optsWithGlobals<GlobalOpts>();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Adding node...").start();
        try {
          const res = await client.postRaw<{ result: string }>(
            "/api/protocol/graph",
            {
              action: "addNode",
              systemId,
              type: opts.type,
              title: opts.title,
              description: opts.description,
              x: Number(opts.x),
              y: Number(opts.y),
            },
            { idempotencyKey: opts.idempotencyKey ?? randomUUID() }
          );
          spinner.stop();
          if (!res.ok || !res.data) {
            throw new Error(res.error?.message ?? "Failed to add node");
          }
          if (global.json) {
            printJson({ nodeId: res.data.result });
            return;
          }
          printSuccess(`Added node: ${res.data.result}`);
          console.log(`  Type:  ${opts.type}`);
          console.log(`  Title: ${opts.title}`);
        } catch (err) {
          spinner.stop();
          printError(err);
        }
      }
    );

  graph
    .command("add-pipe <systemId>")
    .description("Add a pipe (edge) between two nodes")
    .requiredOption("--from <nodeId>", "Source node ID")
    .requiredOption("--to <nodeId>", "Target node ID")
    .option("--idempotency-key <key>", "Idempotency key for safe retries")
    .action(
      async (
        systemId: string,
        opts: { from: string; to: string; idempotencyKey?: string }
      ) => {
        const global = program.optsWithGlobals<GlobalOpts>();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Adding pipe...").start();
        try {
          const res = await client.postRaw<{ result: string }>(
            "/api/protocol/graph",
            {
              action: "addPipe",
              systemId,
              fromNodeId: opts.from,
              toNodeId: opts.to,
            },
            { idempotencyKey: opts.idempotencyKey ?? randomUUID() }
          );
          spinner.stop();
          if (!res.ok || !res.data) {
            throw new Error(res.error?.message ?? "Failed to add pipe");
          }
          if (global.json) {
            printJson({ pipeId: res.data.result });
            return;
          }
          printSuccess(`Added pipe: ${res.data.result}`);
          console.log(`  From: ${opts.from}`);
          console.log(`  To:   ${opts.to}`);
        } catch (err) {
          spinner.stop();
          printError(err);
        }
      }
    );

  graph
    .command("delete-node <nodeId>")
    .description("Delete a node from a system graph")
    .action(async (nodeId: string) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const client = makeClient({ api: global.api, token: global.token });
      const spinner = ora("Deleting node...").start();
      try {
        const res = await client.postRaw<{ result: unknown }>(
          "/api/protocol/graph",
          { action: "deleteNode", nodeId },
          { idempotencyKey: randomUUID() }
        );
        spinner.stop();
        if (!res.ok) {
          throw new Error(res.error?.message ?? "Failed to delete node");
        }
        if (global.json) {
          printJson({ deleted: true });
          return;
        }
        printSuccess(`Deleted node: ${nodeId}`);
      } catch (err) {
        spinner.stop();
        printError(err);
      }
    });

  graph
    .command("delete-pipe <pipeId>")
    .description("Delete a pipe from a system graph")
    .action(async (pipeId: string) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const client = makeClient({ api: global.api, token: global.token });
      const spinner = ora("Deleting pipe...").start();
      try {
        const res = await client.postRaw<{ result: unknown }>(
          "/api/protocol/graph",
          { action: "deletePipe", pipeId },
          { idempotencyKey: randomUUID() }
        );
        spinner.stop();
        if (!res.ok) {
          throw new Error(res.error?.message ?? "Failed to delete pipe");
        }
        if (global.json) {
          printJson({ deleted: true });
          return;
        }
        printSuccess(`Deleted pipe: ${pipeId}`);
      } catch (err) {
        spinner.stop();
        printError(err);
      }
    });
}
