import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { MemoryRecord } from "./types.js";
import { embed, storeEmbedding, embeddingsEnabled } from "./vector-store.js";
import { MemoryRecordSchema } from "./schema.js";
import { withSpan } from "../telemetry.js";

let _sessionTokensUsed = 0;

export function getSessionTokensUsed(): number {
  return _sessionTokensUsed;
}

const SYSTEM_PROMPT = `You are a metadata extraction system. Given content, return ONLY a JSON object with these exact fields:
{
  "title": "concise title (max 60 chars)",
  "content_type": "note|decision|fact|task|summary|reference|code|conversation",
  "topic": "main topic in 2-4 words",
  "summary": "2-3 sentence summary",
  "tags": ["tag1", "tag2"],
  "entities": ["named entities: people, systems, orgs, products"],
  "keywords": ["important terms for keyword search"],
  "audience": "who this is for",
  "intent": "what this content aims to do",
  "confidence_score": 0.85,
  "freshness_score": 1.0,
  "importance_score": 0.7,
  "status": "active",
  "contradictions": [],
  "citations": []
}
Return ONLY valid JSON. No markdown fences. No explanation.`;

export async function extractMetadata(
  content: string,
  hints: { content_type?: string; topic?: string } = {}
): Promise<MemoryRecord> {
  const budget = process.env["PIPES_TOKEN_BUDGET"] ? parseInt(process.env["PIPES_TOKEN_BUDGET"], 10) : null;
  if (budget !== null && _sessionTokensUsed >= budget) {
    throw new Error(`Token budget exceeded: used ${_sessionTokensUsed} of ${budget} tokens this session. Set PIPES_TOKEN_BUDGET to increase.`);
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for memory extraction. Set it in your environment.");
  }

  const hintLines = Object.entries(hints)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const userContent = hintLines
    ? `Hints: ${hintLines}\n\nContent:\n${content}`
    : content;

  process.stderr.write("  Extracting metadata");

  const res = await withSpan(
    "pipes.memory.extract",
    {
      "gen_ai.system": "openai",
      "gen_ai.request.model": process.env["OPENAI_MODEL"] ?? "gpt-4.1-mini",
      "gen_ai.operation.name": "extract_metadata",
    },
    () => fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env["OPENAI_MODEL"] ?? "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        stream: true,
      }),
    })
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI extraction failed (${res.status}): ${errText}`);
  }

  let raw: string;

  if (res.body == null) {
    // Non-streaming fallback
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    raw = data.choices[0]?.message.content ?? "";
    process.stderr.write("\n");
  } else {
    let fullContent = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as { choices: Array<{ delta?: { content?: string } }> };
          const delta = parsed.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            // Write progress dots to stderr (every ~20 chars)
            if (fullContent.length % 20 < delta.length) {
              process.stderr.write(".");
            }
          }
        } catch { /* skip malformed SSE line */ }
      }
    }
    process.stderr.write("\n");
    raw = fullContent;
  }

  if (!raw) throw new Error("OpenAI returned an empty response");

  // Validate with up to 3 attempts if schema parse fails
  let extracted: z.infer<typeof MemoryRecordSchema> | null = null;
  let lastParseError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rawObj = JSON.parse(raw);
      const result = MemoryRecordSchema.safeParse(rawObj);
      if (result.success) {
        extracted = result.data;
        break;
      }
      lastParseError = result.error;
      // On validation failure (not parse failure), use partial data with defaults
      extracted = MemoryRecordSchema.parse({ ...rawObj }); // will throw with defaults filled
      break;
    } catch (err) {
      lastParseError = err;
      if (attempt === 2) break; // give up after 3 attempts
      // Small delay before retry
      await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  if (!extracted) {
    // Fallback: use defaults only
    extracted = MemoryRecordSchema.parse({});
    process.stderr.write(`  Warning: metadata extraction failed validation, using defaults. (${lastParseError instanceof Error ? lastParseError.message : String(lastParseError)})\n`);
  }

  const now = new Date().toISOString();

  const record: MemoryRecord = {
    content_id: randomUUID(),
    ...extracted,
    version: 1,
    parent_id: undefined,
    related_ids: [],
    embedding_vector: undefined,
    created_at: now,
    updated_at: now,
    raw_content: content,
  };

  _sessionTokensUsed += Math.ceil(content.length / 4);

  process.stderr.write(`  title: ${record.title ?? "(untitled)"}\n`);
  process.stderr.write(`  type: ${record.content_type ?? "note"}  topic: ${record.topic ?? "-"}\n`);

  // Generate and store embedding if API key is available
  if (embeddingsEnabled()) {
    try {
      const vector = await embed(content);
      record.embedding_vector = vector;
      storeEmbedding(record.content_id, vector);
    } catch {
      // embedding failure is non-fatal — keyword search still works
    }
  }

  return record;
}

export async function embedQuery(text: string): Promise<number[] | null> {
  if (!embeddingsEnabled()) return null;
  try {
    return await embed(text);
  } catch {
    return null;
  }
}

export function scoreRecord(record: MemoryRecord, queryKeywords: string[], vectorScore = 0): number {
  const searchable = [
    record.title,
    record.summary,
    record.topic,
    ...record.tags,
    ...record.keywords,
    ...record.entities,
    record.raw_content,
  ]
    .join(" ")
    .toLowerCase();

  const hits = queryKeywords.filter((kw) =>
    searchable.includes(kw.toLowerCase())
  ).length;
  const kwScore = queryKeywords.length > 0 ? hits / queryKeywords.length : 0;

  return (
    0.4 * kwScore +
    0.4 * vectorScore +
    0.1 * record.importance_score +
    0.1 * record.freshness_score
  );
}

export function compressForContext(
  records: MemoryRecord[],
  maxChars = 4000
): string {
  const lines: string[] = [];
  let chars = 0;
  for (const r of records) {
    const block = [
      `[${r.content_type.toUpperCase()}] ${r.title}`,
      `Status: ${r.status} | Confidence: ${r.confidence_score.toFixed(2)} | Importance: ${r.importance_score.toFixed(2)}`,
      `Topic: ${r.topic}`,
      `Summary: ${r.summary}`,
      "---",
    ].join("\n");
    if (chars + block.length > maxChars) break;
    lines.push(block);
    chars += block.length;
  }
  return lines.join("\n");
}
