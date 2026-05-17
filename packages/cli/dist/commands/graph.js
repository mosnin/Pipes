import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ora from "ora";
import { makeClient } from "../client.js";
import { printJson, printError, printSuccess, printTable } from "../output.js";
export function registerGraph(program) {
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
        .action(async (systemId, opts) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Adding node...").start();
        try {
            const res = await client.postRaw("/api/protocol/graph", {
                action: "addNode",
                systemId,
                type: opts.type,
                title: opts.title,
                description: opts.description,
                x: Number(opts.x),
                y: Number(opts.y),
            }, { idempotencyKey: opts.idempotencyKey ?? randomUUID() });
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
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    graph
        .command("add-pipe <systemId>")
        .description("Add a pipe (edge) between two nodes")
        .requiredOption("--from <nodeId>", "Source node ID")
        .requiredOption("--to <nodeId>", "Target node ID")
        .option("--idempotency-key <key>", "Idempotency key for safe retries")
        .action(async (systemId, opts) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Adding pipe...").start();
        try {
            const res = await client.postRaw("/api/protocol/graph", {
                action: "addPipe",
                systemId,
                fromNodeId: opts.from,
                toNodeId: opts.to,
            }, { idempotencyKey: opts.idempotencyKey ?? randomUUID() });
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
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    graph
        .command("delete-node <nodeId>")
        .description("Delete a node from a system graph")
        .action(async (nodeId) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Deleting node...").start();
        try {
            const res = await client.postRaw("/api/protocol/graph", { action: "deleteNode", nodeId }, { idempotencyKey: randomUUID() });
            spinner.stop();
            if (!res.ok) {
                throw new Error(res.error?.message ?? "Failed to delete node");
            }
            if (global.json) {
                printJson({ deleted: true });
                return;
            }
            printSuccess(`Deleted node: ${nodeId}`);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    graph
        .command("delete-pipe <pipeId>")
        .description("Delete a pipe from a system graph")
        .action(async (pipeId) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        const spinner = ora("Deleting pipe...").start();
        try {
            const res = await client.postRaw("/api/protocol/graph", { action: "deletePipe", pipeId }, { idempotencyKey: randomUUID() });
            spinner.stop();
            if (!res.ok) {
                throw new Error(res.error?.message ?? "Failed to delete pipe");
            }
            if (global.json) {
                printJson({ deleted: true });
                return;
            }
            printSuccess(`Deleted pipe: ${pipeId}`);
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
    graph
        .command("get <systemId>")
        .description("Display nodes and pipes for a system graph")
        .action(async (systemId) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        try {
            const res = await client.getRaw(`/api/protocol/systems/${systemId}/schema`);
            if (!res.ok || !res.data) {
                throw new Error(res.error?.message ?? "Failed to fetch graph");
            }
            const nodes = res.data.nodes ?? [];
            const pipes = res.data.pipes ?? [];
            if (global.json) {
                printJson({ nodes, pipes });
                return;
            }
            console.log(`\nNodes (${nodes.length})`);
            printTable(nodes.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                description: n.description
                    ? n.description.length > 40
                        ? n.description.slice(0, 37) + "..."
                        : n.description
                    : "",
            })), [
                { key: "id", label: "ID" },
                { key: "type", label: "TYPE" },
                { key: "title", label: "TITLE" },
                { key: "description", label: "DESCRIPTION" },
            ]);
            console.log(`\nPipes (${pipes.length})`);
            printTable(pipes.map((p) => ({
                id: p.id,
                fromNode: p.fromNodeId ?? p.fromPortId ?? "",
                toNode: p.toNodeId ?? p.toPortId ?? "",
            })), [
                { key: "id", label: "ID" },
                { key: "fromNode", label: "FROM NODE" },
                { key: "toNode", label: "TO NODE" },
            ]);
        }
        catch (err) {
            printError(err);
        }
    });
    graph
        .command("apply [file]")
        .description("Apply a batch of graph actions from a JSON file or stdin")
        .option("--idempotency-key <key>", "Idempotency key for safe retries")
        .action(async (file, opts) => {
        const global = program.optsWithGlobals();
        const client = makeClient({ api: global.api, token: global.token });
        let raw;
        if (file) {
            raw = readFileSync(file, "utf-8");
        }
        else {
            raw = readFileSync("/dev/stdin", "utf-8");
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            printError(new Error("Invalid JSON input"));
        }
        let actions;
        if (Array.isArray(parsed)) {
            actions = parsed;
        }
        else if (parsed &&
            typeof parsed === "object" &&
            "actions" in parsed &&
            Array.isArray(parsed.actions)) {
            actions = parsed.actions;
        }
        else {
            printError(new Error('Input must be a JSON array or an object with an "actions" array'));
        }
        const spinner = ora(`Applying ${actions.length} actions...`).start();
        try {
            const res = await client.postRaw("/api/protocol/graph", { actions: actions }, { idempotencyKey: opts.idempotencyKey ?? randomUUID() });
            spinner.stop();
            if (!res.ok || !res.data) {
                throw new Error(res.error?.message ?? "Failed to apply actions");
            }
            const { results, count } = res.data;
            const replayed = res.replayed ?? false;
            if (global.json) {
                printJson({ results, count, replayed });
                return;
            }
            for (const result of results) {
                if (result == null) {
                    console.log("  - (no-op)");
                }
                else {
                    console.log(`  ✓ ${String(result)}`);
                }
            }
            printSuccess(`Applied ${count} actions`);
            if (replayed) {
                console.log("  (replayed — idempotency key already used)");
            }
        }
        catch (err) {
            spinner.stop();
            printError(err);
        }
    });
}
