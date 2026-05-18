import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import ora from "ora";
import { makeClient } from "../client.js";
import { printJson, printError, printSuccess, printReplayed } from "../output.js";

async function promptBody(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Comment body: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

interface GlobalOpts {
  api?: string;
  token?: string;
  json?: boolean;
}

export function registerComments(program: Command): void {
  const comments = program.command("comments").description("Manage system comments");

  comments
    .command("add <systemId>")
    .description("Add a comment to a system or a specific node")
    .option("--body <body>", "Comment text (prompted if omitted)")
    .option("--node-id <nodeId>", "Attach comment to a specific node")
    .option("--idempotency-key <key>", "Idempotency key for safe retries")
    .action(
      async (
        systemId: string,
        opts: { body?: string; nodeId?: string; idempotencyKey?: string }
      ) => {
        const global = program.optsWithGlobals<GlobalOpts>();
        const client = makeClient({ api: global.api, token: global.token });

        const body = opts.body ?? (await promptBody());
        if (!body) {
          printError(new Error("Comment body is required"));
        }

        const spinner = ora("Adding comment...").start();
        try {
          const payload: Record<string, unknown> = { systemId, body };
          if (opts.nodeId) payload["nodeId"] = opts.nodeId;

          const ikey = opts.idempotencyKey ?? randomUUID();
          const res = await client.postRaw<{ commentId: string }>(
            "/api/protocol/comments",
            payload,
            { idempotencyKey: ikey }
          );
          spinner.stop();
          if (!res.ok || !res.data) {
            throw new Error(res.error?.message ?? "Failed to add comment");
          }
          if (global.json) {
            printJson({ commentId: res.data.commentId, replayed: res.replayed });
            return;
          }
          if (res.replayed) printReplayed();
          printSuccess(`Comment added: ${res.data.commentId}`);
        } catch (err) {
          spinner.stop();
          printError(err);
        }
      }
    );
}
