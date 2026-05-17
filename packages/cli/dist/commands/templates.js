import { randomUUID } from "node:crypto";
import ora from "ora";
import { makeClient } from "../client.js";
import { printJson, printTable, printError, printSuccess, printReplayed } from "../output.js";
export function registerTemplates(program) {
    const templates = program.command("templates").description("Manage starter templates");
    templates
        .command("list")
        .description("List available starter templates")
        .action(async () => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Fetching templates...").start();
        try {
            const data = await client.get("/api/protocol/templates");
            spinner.stop();
            if (global.json) {
                printJson(data);
                return;
            }
            printTable(data, [
                { key: "id", label: "ID", width: 30 },
                { key: "name", label: "NAME", width: 30 },
                { key: "description", label: "DESCRIPTION", width: 50 },
            ]);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    templates
        .command("instantiate <templateId>")
        .description("Create a new system from a template")
        .option("--name <name>", "System name")
        .option("--idempotency-key <key>", "Idempotency key for safe retries")
        .action(async (templateId, opts) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora(`Instantiating template ${templateId}...`).start();
        try {
            const ikey = opts.idempotencyKey ?? randomUUID();
            const res = await client.postRaw(`/api/protocol/templates/${templateId}/instantiate`, { name: opts.name }, { idempotencyKey: ikey });
            spinner.stop();
            if (!res.ok || !res.data) {
                throw new Error(res.error?.message ?? "Failed to instantiate template");
            }
            if (global.json) {
                printJson({ systemId: res.data.systemId, replayed: res.replayed });
                return;
            }
            if (res.replayed)
                printReplayed();
            printSuccess(`Created system from template: ${res.data.systemId}`);
            if (opts.name)
                console.log(`  Name: ${opts.name}`);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
}
