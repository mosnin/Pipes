import { Command } from "commander";
import { randomUUID } from "node:crypto";
import ora from "ora";
import { makeClient } from "../client.js";
import { printJson, printTable, printError, printSuccess } from "../output.js";
import { extractMetadata, scoreRecord } from "../memory/extract.js";
import type { MemoryRecord } from "../memory/types.js";

interface GlobalOpts {
  api?: string;
  token?: string;
  json?: boolean;
}

interface SchemaData {
  nodes: Array<{ id: string; type: string; title: string; description?: string }>;
}

function getMemorySystemId(flagValue: string | undefined): string {
  const id = flagValue ?? process.env["PIPES_MEMORY_SYSTEM"];
  if (!id) {
    throw new Error(
      "No memory system ID. Pass --system <id> or set PIPES_MEMORY_SYSTEM env var."
    );
  }
  return id;
}

function parseNodeAsRecord(node: { id: string; description?: string }): MemoryRecord | null {
  try {
    if (!node.description) return null;
    const r = JSON.parse(node.description) as MemoryRecord;
    // backfill content_id from node id if missing
    if (!r.content_id) r.content_id = node.id;
    return r;
  } catch {
    return null;
  }
}

export function registerMemory(program: Command): void {
  const memory = program
    .command("memory")
    .description("Manage memory records stored in a Pipes memory system");

  // pipes memory add <content>
  memory
    .command("add <content>")
    .description("Add a memory record to the memory system")
    .option("--system <id>", "Memory system ID (overrides PIPES_MEMORY_SYSTEM)")
    .option("--type <content_type>", "Content type (note, decision, fact, task, summary, reference, code, conversation)")
    .option("--topic <topic>", "Topic to associate with the memory")
    .option("--no-extract", "Skip LLM extraction and store raw content with minimal metadata")
    .action(
      async (
        content: string,
        opts: { system?: string; type?: string; topic?: string; extract: boolean }
      ) => {
        const global = program.optsWithGlobals<GlobalOpts>();
        const client = makeClient({ api: global.api, token: global.token });

        let systemId: string;
        try {
          systemId = getMemorySystemId(opts.system);
        } catch (err) {
          printError(err);
        }

        let record: MemoryRecord;

        if (!opts.extract) {
          // --no-extract: build minimal record manually
          const now = new Date().toISOString();
          record = {
            content_id: randomUUID(),
            title: content.slice(0, 60),
            content_type: (opts.type as MemoryRecord["content_type"]) ?? "note",
            topic: opts.topic ?? "",
            summary: content.slice(0, 200),
            tags: [],
            entities: [],
            keywords: [],
            confidence_score: 0.7,
            freshness_score: 0.7,
            importance_score: 0.7,
            status: "active",
            version: 1,
            related_ids: [],
            contradictions: [],
            citations: [],
            created_at: now,
            updated_at: now,
            raw_content: content,
          };
        } else {
          const spinner = ora("Extracting metadata...").start();
          try {
            record = await extractMetadata(content, {
              content_type: opts.type as MemoryRecord["content_type"] | undefined,
              topic: opts.topic,
            });
            spinner.succeed("Extracted metadata");
          } catch (err) {
            spinner.stop();
            printError(err);
          }
        }

        const storeSpinner = ora("Storing...").start();
        try {
          const res = await client.postRaw<{ result: string }>(
            "/api/protocol/graph",
            {
              action: "addNode",
              systemId: systemId!,
              type: "Memory",
              title: record!.title,
              description: JSON.stringify(record!),
              x: 0,
              y: 0,
            },
            { idempotencyKey: randomUUID() }
          );
          storeSpinner.stop();
          if (!res.ok || !res.data) {
            throw new Error(res.error?.message ?? "Failed to store memory record");
          }
          const nodeId = res.data.result;
          if (global.json) {
            printJson({ nodeId, contentId: record!.content_id, title: record!.title });
            return;
          }
          printSuccess(`Stored: ${record!.title}`);
          console.log(`  ID: ${nodeId}`);
          console.log(`  Type: ${record!.content_type}`);
          console.log(`  Topic: ${record!.topic}`);
        } catch (err) {
          storeSpinner.stop();
          printError(err);
        }
      }
    );

  // pipes memory search <query>
  memory
    .command("search <query>")
    .description("Search memory records by relevance to a query")
    .option("--system <id>", "Memory system ID (overrides PIPES_MEMORY_SYSTEM)")
    .option("--type <content_type>", "Filter by content type")
    .option("--status <status>", "Filter by status (default: excludes archived)")
    .option("--limit <n>", "Maximum number of results (default: 5)", "5")
    .action(
      async (
        query: string,
        opts: { system?: string; type?: string; status?: string; limit: string }
      ) => {
        const global = program.optsWithGlobals<GlobalOpts>();
        const client = makeClient({ api: global.api, token: global.token });

        let systemId: string;
        try {
          systemId = getMemorySystemId(opts.system);
        } catch (err) {
          printError(err);
        }

        const limit = parseInt(opts.limit, 10) || 5;
        const spinner = ora("Searching...").start();

        try {
          const res = await client.getRaw<SchemaData>(
            `/api/protocol/systems/${systemId!}/schema`
          );
          if (!res.ok || !res.data) {
            throw new Error(res.error?.message ?? "Failed to fetch memory system");
          }

          const memoryNodes = res.data.nodes.filter((n) => n.type === "Memory");

          let records: Array<{ nodeId: string; record: MemoryRecord }> = [];
          for (const node of memoryNodes) {
            const record = parseNodeAsRecord(node);
            if (!record) continue;
            records.push({ nodeId: node.id, record });
          }

          // filter by type if provided
          if (opts.type) {
            records = records.filter((r) => r.record.content_type === opts.type);
          }

          // filter by status (default: exclude archived)
          if (opts.status) {
            records = records.filter((r) => r.record.status === opts.status);
          } else {
            records = records.filter((r) => r.record.status !== "archived");
          }

          // score and rank
          const keywords = query
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2);

          const scored = records
            .map((r) => ({ ...r, score: scoreRecord(r.record, keywords) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

          spinner.stop();

          if (global.json) {
            printJson(scored.map((r) => ({ nodeId: r.nodeId, score: r.score, record: r.record })));
            return;
          }

          if (scored.length === 0) {
            console.log("No matching memory records found.");
            return;
          }

          for (const item of scored) {
            const { record, score } = item;
            const typeLabel = `[${record.content_type.toUpperCase()}]`;
            const titleTrunc = record.title.length > 45
              ? record.title.slice(0, 42) + "..."
              : record.title;
            const scoreLabel = `score: ${score.toFixed(2)}`;
            const leftCol = `${typeLabel} ${titleTrunc}`;
            const padding = Math.max(1, 60 - leftCol.length);
            console.log(`${leftCol}${" ".repeat(padding)}${scoreLabel}`);
            console.log(`  Topic: ${record.topic} | Status: ${record.status} | Confidence: ${record.confidence_score.toFixed(2)}`);
            console.log(`  Summary: ${record.summary}`);
            console.log();
          }
        } catch (err) {
          spinner.stop();
          printError(err);
        }
      }
    );

  // pipes memory list
  memory
    .command("list")
    .description("List all memory records in the memory system")
    .option("--system <id>", "Memory system ID (overrides PIPES_MEMORY_SYSTEM)")
    .option("--type <content_type>", "Filter by content type")
    .option("--status <status>", "Filter by status (default: excludes archived)")
    .action(
      async (opts: { system?: string; type?: string; status?: string }) => {
        const global = program.optsWithGlobals<GlobalOpts>();
        const client = makeClient({ api: global.api, token: global.token });

        let systemId: string;
        try {
          systemId = getMemorySystemId(opts.system);
        } catch (err) {
          printError(err);
        }

        const spinner = ora("Fetching memory records...").start();

        try {
          const res = await client.getRaw<SchemaData>(
            `/api/protocol/systems/${systemId!}/schema`
          );
          if (!res.ok || !res.data) {
            throw new Error(res.error?.message ?? "Failed to fetch memory system");
          }

          const memoryNodes = res.data.nodes.filter((n) => n.type === "Memory");

          let records: Array<{ nodeId: string; record: MemoryRecord }> = [];
          for (const node of memoryNodes) {
            const record = parseNodeAsRecord(node);
            if (!record) continue;
            records.push({ nodeId: node.id, record });
          }

          // filter by type if provided
          if (opts.type) {
            records = records.filter((r) => r.record.content_type === opts.type);
          }

          // filter by status (default: exclude archived)
          if (opts.status) {
            records = records.filter((r) => r.record.status === opts.status);
          } else {
            records = records.filter((r) => r.record.status !== "archived");
          }

          spinner.stop();

          if (global.json) {
            printJson(records.map((r) => r.record));
            return;
          }

          printTable(
            records.map((r) => ({
              id: r.nodeId.slice(0, 20),
              title: r.record.title.length > 35
                ? r.record.title.slice(0, 32) + "..."
                : r.record.title,
              type: r.record.content_type,
              status: r.record.status,
              importance: r.record.importance_score.toFixed(2),
            })),
            [
              { key: "id", label: "ID", width: 20 },
              { key: "title", label: "TITLE", width: 35 },
              { key: "type", label: "TYPE", width: 12 },
              { key: "status", label: "STATUS", width: 10 },
              { key: "importance", label: "IMPORTANCE", width: 10 },
            ]
          );
        } catch (err) {
          spinner.stop();
          printError(err);
        }
      }
    );

  // pipes memory get <nodeId>
  memory
    .command("get <nodeId>")
    .description("Get a specific memory record by node ID")
    .option("--system <id>", "Memory system ID (overrides PIPES_MEMORY_SYSTEM)")
    .action(async (nodeId: string, opts: { system?: string }) => {
      const global = program.optsWithGlobals<GlobalOpts>();
      const client = makeClient({ api: global.api, token: global.token });

      let systemId: string;
      try {
        systemId = getMemorySystemId(opts.system);
      } catch (err) {
        printError(err);
      }

      const spinner = ora("Fetching memory record...").start();

      try {
        const res = await client.getRaw<SchemaData>(
          `/api/protocol/systems/${systemId!}/schema`
        );
        if (!res.ok || !res.data) {
          throw new Error(res.error?.message ?? "Failed to fetch memory system");
        }

        const node = res.data.nodes.find((n) => n.id === nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }

        const record = parseNodeAsRecord(node);
        if (!record) {
          throw new Error(`Node ${nodeId} is not a valid memory record`);
        }

        spinner.stop();

        if (global.json) {
          printJson(record);
          return;
        }

        console.log(`Title:       ${record.title}`);
        console.log(`Type:        ${record.content_type}`);
        console.log(`Topic:       ${record.topic}`);
        console.log(`Summary:     ${record.summary}`);
        console.log(`Tags:        ${record.tags.join(", ") || "(none)"}`);
        console.log(`Status:      ${record.status}`);
        console.log(`Confidence:  ${record.confidence_score.toFixed(2)}`);
        console.log(`Importance:  ${record.importance_score.toFixed(2)}`);
        console.log(`Freshness:   ${record.freshness_score.toFixed(2)}`);
        console.log(`Created:     ${record.created_at}`);
        console.log(`Entities:    ${record.entities.join(", ") || "(none)"}`);
        console.log(`Keywords:    ${record.keywords.join(", ") || "(none)"}`);
      } catch (err) {
        spinner.stop();
        printError(err);
      }
    });

  // pipes memory link <fromId> <toId>
  memory
    .command("link <fromId> <toId>")
    .description(
      "Link two memory records with a relation. Relation types: supports, contradicts, derives-from, supersedes, references"
    )
    .option("--system <id>", "Memory system ID (overrides PIPES_MEMORY_SYSTEM)")
    .requiredOption("--rel <relation>", "Relation type (supports, contradicts, derives-from, supersedes, references)")
    .action(
      async (
        fromId: string,
        toId: string,
        opts: { system?: string; rel: string }
      ) => {
        const global = program.optsWithGlobals<GlobalOpts>();
        const client = makeClient({ api: global.api, token: global.token });

        let systemId: string;
        try {
          systemId = getMemorySystemId(opts.system);
        } catch (err) {
          printError(err);
        }

        const spinner = ora("Linking memory records...").start();

        try {
          const res = await client.postRaw<{ result: string }>(
            "/api/protocol/graph",
            {
              action: "addPipe",
              systemId: systemId!,
              fromNodeId: fromId,
              toNodeId: toId,
            },
            { idempotencyKey: randomUUID() }
          );
          spinner.stop();
          if (!res.ok || !res.data) {
            throw new Error(res.error?.message ?? "Failed to link memory records");
          }
          if (global.json) {
            printJson({ pipeId: res.data.result, fromId, toId, rel: opts.rel });
            return;
          }
          printSuccess(`Linked: ${fromId} --[${opts.rel}]--> ${toId}`);
        } catch (err) {
          spinner.stop();
          printError(err);
        }
      }
    );
}
