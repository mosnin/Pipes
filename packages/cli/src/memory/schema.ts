import { z } from "zod";

export const MemoryRecordSchema = z.object({
  title: z.string().max(100).default("Untitled"),
  content_type: z.enum(["note", "decision", "fact", "task", "summary", "reference", "code", "conversation"]).default("note"),
  topic: z.string().default("general"),
  summary: z.string().default(""),
  tags: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  audience: z.string().optional(),
  intent: z.string().optional(),
  confidence_score: z.number().min(0).max(1).default(0.5),
  freshness_score: z.number().min(0).max(1).default(1.0),
  importance_score: z.number().min(0).max(1).default(0.5),
  status: z.enum(["active", "draft", "pending", "stale", "archived"]).default("active"),
  contradictions: z.array(z.string()).default([]),
  citations: z.array(z.string()).default([]),
});

export type ExtractedMetadata = z.infer<typeof MemoryRecordSchema>;
