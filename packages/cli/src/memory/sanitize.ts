const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
  /you\s+are\s+now\s+/i,
  /disregard\s+(all\s+)?(previous\s+)?(instructions?|prompts?)/i,
  /system\s+prompt\s*:/i,
  /\[\s*system\s*\]/i,
  /new\s+instructions?\s*:/i,
  /forget\s+(all\s+)?(previous|your)\s+/i,
  /act\s+as\s+(if\s+you\s+are|a\s+)/i,
];

export function sanitizeContent(content: string): string {
  if (content.length > 100_000) {
    throw new Error(`Content too large: ${content.length} chars (limit: 100,000)`);
  }
  // Strip null bytes and dangerous control characters (keep \n, \r, \t)
  return content.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

export function detectInjection(content: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    const match = content.match(pattern);
    if (match) return match[0];
  }
  return null;
}
