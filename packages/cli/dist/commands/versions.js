import { randomUUID } from "node:crypto";
import ora from "ora";
import { makeClient } from "../client.js";
import { printJson, printTable, printError, printSuccess, printReplayed } from "../output.js";
export function registerVersions(program) {
    const versions = program.command("versions").description("Manage system version snapshots");
    versions
        .command("list <systemId>")
        .description("List all versions of a system")
        .action(async (systemId) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Fetching versions...").start();
        try {
            const data = await client.get(`/api/protocol/systems/${systemId}/versions`);
            spinner.stop();
            if (global.json) {
                printJson(data);
                return;
            }
            printTable(data, [
                { key: "id", label: "ID", width: 20 },
                { key: "name", label: "NAME", width: 30 },
                { key: "authorId", label: "AUTHOR", width: 20 },
                { key: "createdAt", label: "CREATED AT", width: 25 },
            ]);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    versions
        .command("create <systemId>")
        .description("Create a named version snapshot of a system")
        .option("--name <name>", "Version name")
        .option("--idempotency-key <key>", "Idempotency key for safe retries")
        .action(async (systemId, opts) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Creating version...").start();
        try {
            const ikey = opts.idempotencyKey ?? randomUUID();
            const res = await client.postRaw(`/api/protocol/systems/${systemId}/versions`, { name: opts.name }, { idempotencyKey: ikey });
            spinner.stop();
            if (!res.ok || !res.data) {
                throw new Error(res.error?.message ?? "Failed to create version");
            }
            if (global.json) {
                printJson({ versionId: res.data.versionId, replayed: res.replayed });
                return;
            }
            if (res.replayed)
                printReplayed();
            printSuccess(`Created version: ${res.data.versionId}`);
            if (opts.name)
                console.log(`  Name: ${opts.name}`);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
}
