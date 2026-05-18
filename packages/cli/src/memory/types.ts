export interface MemoryRecord {
  content_id: string;
  title: string;
  content_type: "note" | "decision" | "fact" | "task" | "summary" | "reference" | "code" | "conversation";
  topic: string;
  summary: string;
  tags: string[];
  entities: string[];
  keywords: string[];
  audience?: string;
  intent?: string;
  confidence_score: number;
  freshness_score: number;
  importance_score: number;
  status: "active" | "draft" | "pending" | "stale" | "archived";
  version: number;
  parent_id?: string;
  related_ids: string[];
  contradictions: string[];
  citations: string[];
  embedding_vector?: number[];
  created_at: string;
  updated_at: string;
  raw_content: string;
}

export interface MemoryEdge {
  pipe_id: string;
  from_id: string;
  to_id: string;
  relation: string;
  created_at: string;
  supersedes_at?: string;
  weight: number;
}
