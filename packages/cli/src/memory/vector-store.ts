import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { withSpan } from "../telemetry.js";

const EMBEDDING_DIM = 1536; // text-embedding-3-small

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  const dir = join(homedir(), ".pipes");
  mkdirSync(dir, { recursive: true });
  const db = new Database(join(dir, "memory.db"));
  sqliteVec.load(db);
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
      content_id TEXT PRIMARY KEY,
      embedding FLOAT[${EMBEDDING_DIM}]
    )
  `);
  _db = db;
  return db;
}

export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY required for embeddings");

  const res = await withSpan(
    "pipes.memory.embed",
    {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "text-embedding-3-small",
      "gen_ai.operation.name": "embed",
    },
    () => fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    })
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const vector = data.data[0]?.embedding;
  if (!vector) throw new Error("No embedding returned");
  return vector;
}

export function storeEmbedding(contentId: string, vector: number[]): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO embeddings(content_id, embedding) VALUES (?, ?)").run(
    contentId,
    new Float32Array(vector)
  );
}

export interface VectorMatch {
  content_id: string;
  distance: number;
}

export function searchEmbeddings(queryVector: number[], limit: number): VectorMatch[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT content_id, distance
    FROM embeddings
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `
    )
    .all(new Float32Array(queryVector), limit) as Array<{ content_id: string; distance: number }>;
  return rows;
}

export function embeddingsEnabled(): boolean {
  return Boolean(process.env["OPENAI_API_KEY"]);
}
