import { randomUUID } from "node:crypto";
import type { MemoryRecord } from "./types.js";

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

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI extraction failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = data.choices[0]?.message.content;
  if (!raw) throw new Error("OpenAI returned an empty response");

  const extracted = JSON.parse(raw) as Partial<MemoryRecord>;
  const now = new Date().toISOString();

  return {
    content_id: randomUUID(),
    title: extracted.title ?? content.slice(0, 60).replace(/\n/g, " "),
    content_type: extracted.content_type ?? "note",
    topic: extracted.topic ?? "general",
    summary: extracted.summary ?? content.slice(0, 200),
    tags: extracted.tags ?? [],
    entities: extracted.entities ?? [],
    keywords: extracted.keywords ?? [],
    audience: extracted.audience,
    intent: extracted.intent,
    confidence_score: extracted.confidence_score ?? 0.7,
    freshness_score: extracted.freshness_score ?? 1.0,
    importance_score: extracted.importance_score ?? 0.5,
    status: extracted.status ?? "active",
    version: 1,
    parent_id: undefined,
    related_ids: [],
    contradictions: extracted.contradictions ?? [],
    citations: extracted.citations ?? [],
    embedding_vector: undefined,
    created_at: now,
    updated_at: now,
    raw_content: content,
  };
}

export function scoreRecord(record: MemoryRecord, queryKeywords: string[]): number {
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
  const keywordScore = queryKeywords.length > 0 ? hits / queryKeywords.length : 0;

  return (
    keywordScore * 0.5 +
    record.confidence_score * 0.2 +
    record.importance_score * 0.2 +
    record.freshness_score * 0.1
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
