import { appendFileSync } from "node:fs";

export interface AuditEntry {
  ts: string;
  command: string;
  args: Record<string, unknown>;
  result: "ok" | "error";
  latency_ms: number;
  tokens_used?: number;
  error?: string;
}

let _auditLogPath: string | null = null;

export function initAuditLog(path: string): void {
  _auditLogPath = path;
}

export function logAuditEntry(entry: AuditEntry): void {
  if (!_auditLogPath) return;
  try {
    appendFileSync(_auditLogPath, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // audit log write failure is non-fatal
  }
}
