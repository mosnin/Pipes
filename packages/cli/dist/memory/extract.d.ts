import type { MemoryRecord } from "./types.js";
export declare function extractMetadata(content: string, hints?: {
    content_type?: string;
    topic?: string;
}): Promise<MemoryRecord>;
export declare function scoreRecord(record: MemoryRecord, queryKeywords: string[]): number;
export declare function compressForContext(records: MemoryRecord[], maxChars?: number): string;
