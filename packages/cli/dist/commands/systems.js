import { randomUUID } from "node:crypto";
import ora from "ora";
import { makeClient } from "../client.js";
import { printJson, printTable, printError, printSuccess, printReplayed } from "../output.js";
export function registerSystems(program) {
    const systems = program.command("systems").description("Manage systems");
    systems
        .command("list")
        .description("List all systems in the workspace")
        .action(async () => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Fetching systems...").start();
        try {
            const data = await client.get("/api/protocol/systems");
            spinner.stop();
            if (global.json) {
                printJson(data);
                return;
            }
            printTable(data, [
                { key: "id", label: "ID", width: 20 },
                { key: "name", label: "NAME", width: 30 },
                { key: "description", label: "DESCRIPTION", width: 40 },
            ]);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    systems
        .command("get <systemId>")
        .description("Get metadata for a system")
        .action(async (systemId) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Fetching system...").start();
        try {
            const data = await client.get(`/api/protocol/systems/${systemId}`);
            spinner.stop();
            if (global.json) {
                printJson(data);
                return;
            }
            console.log(`ID:          ${data.id}`);
            console.log(`Name:        ${data.name}`);
            console.log(`Description: ${data.description ?? "(none)"}`);
            console.log(`Nodes:       ${data.nodes ?? 0}`);
            console.log(`Pipes:       ${data.pipes ?? 0}`);
            if (data.createdAt)
                console.log(`Created:     ${new Date(data.createdAt).toLocaleString()}`);
            if (data.updatedAt)
                console.log(`Updated:     ${new Date(data.updatedAt).toLocaleString()}`);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    systems
        .command("create <name>")
        .description("Create a new system")
        .option("--description <desc>", "System description")
        .option("--idempotency-key <key>", "Idempotency key for safe retries")
        .action(async (name, opts) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Creating system...").start();
        try {
            const res = await client.postRaw("/api/protocol/systems", { name, description: opts.description }, { idempotencyKey: opts.idempotencyKey ?? randomUUID() });
            spinner.stop();
            if (!res.ok || !res.data) {
                throw new Error(res.error?.message ?? "Failed to create system");
            }
            if (global.json) {
                printJson({ systemId: res.data.systemId, replayed: res.replayed });
                return;
            }
            if (res.replayed)
                printReplayed();
            printSuccess(`Created system: ${res.data.systemId}`);
            console.log(`  Name: ${name}`);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
}
