import { Command } from "commander";
import { readFileSync, createWriteStream } from "node:fs";
import ora from "ora";
import { makeClient, ApiError } from "../client.js";
import { loadConfig } from "../config.js";
import { printError, printSuccess, printReplayed } from "../output.js";

interface GlobalOpts {
  api?: string;
  token?: string;
}

export function registerSchema(program: Command): void {
  const schema = program.command("schema").description("Import and export system schemas");

  schema
    .command("export <systemId>")
    .description("Export a system as pipes_schema_v1 JSON (streamed to stdout or a file)")
    .option("--out <file>", "Write output to a file instead of stdout")
    .action(async (systemId: string, opts: { out?: string }) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const cfg = loadConfig({ api: global.api, token: global.token });

      if (!cfg.token) {
        printError(
          new ApiError(
            "AUTH_REQUIRED",
            "No token found. Set PIPES_TOKEN, add it to .pipes.yml, or run: pipes init"
          )
        );
      }

      const spinner = opts.out ? ora(`Exporting schema to ${opts.out}...`).start() : null;

      try {
        const res = await fetch(`${cfg.api}/api/protocol/systems/${systemId}/schema`, {
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${cfg.token}`,
          },
        });

        const dest = opts.out ? createWriteStream(opts.out, "utf8") : process.stdout;

        if (!res.body) {
          dest.write(await res.text());
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            dest.write(decoder.decode(value, { stream: true }));
          }
        }

        if (opts.out) {
          await new Promise<void>((resolve) =>
            (dest as ReturnType<typeof createWriteStream>).end(resolve)
          );
          spinner?.stop();
          printSuccess(`Schema exported to ${opts.out}`);
        } else {
          process.stdout.write("\n");
        }
      } catch (err) {
        spinner?.stop();
        printError(err);
      }
    });

  schema
    .command("import <file>")
    .description("Import a pipes_schema_v1 JSON file as a new system")
    .option("--name <name>", "Override the system name from the schema")
    .option("--idempotency-key <key>", "Idempotency key for safe retries")
    .action(async (file: string, opts: { name?: string; idempotencyKey?: string }) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const client = makeClient({ api: global.api, token: global.token });

      let schemaJson: unknown;
      try {
        schemaJson = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        printError(new Error(`Cannot read or parse ${file}`));
      }

      const spinner = ora("Importing schema...").start();
      try {
        const body: Record<string, unknown> = { schema: schemaJson };
        if (opts.name) body["name"] = opts.name;

        const res = await client.postRaw<{ systemId: string }>(
          "/api/protocol/import/system",
          body,
          { idempotencyKey: opts.idempotencyKey }
        );
        spinner.stop();
        if (!res.ok || !res.data) {
          throw new Error(res.error?.message ?? "Import failed");
        }
        const isJson = (program.optsWithGlobals() as { json?: boolean }).json;
        if (isJson) {
          console.log(JSON.stringify({ systemId: res.data.systemId, replayed: res.replayed }, null, 2));
          return;
        }
        if (res.replayed) printReplayed();
        printSuccess(`Imported as system: ${res.data.systemId}`);
      } catch (err) {
        spinner.stop();
        printError(err);
      }
    });
}
