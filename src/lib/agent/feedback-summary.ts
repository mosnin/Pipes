import type { FeedbackEntryRecord } from "@/lib/repositories/contracts";

/**
 * Summarizes the user's last 7 days of feedback into a short hint string the
 * agent can read. The output is at most 160 characters and always ASCII.
 *
 * The summary is a HINT (drift signal) for the agent, not training data.
 * Keep it tight: a thumbs tally, an NPS average, nothing more. The room to
 * grow this is intentional. Anything richer belongs in fine-tuning, not in
 * the per-turn system prompt.
 *
 * Returns an empty string when no relevant entries exist; the prompt
 * substitution layer renders that cleanly.
 */
const MAX_LEN = 160;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function summarizeFeedback(
  entries: ReadonlyArray<FeedbackEntryRecord>,
  options?: { now?: Date }
): string {
  if (!Array.isArray(entries) || entries.length === 0) return "";

  const now = options?.now ?? new Date();
  const cutoff = now.getTime() - SEVEN_DAYS_MS;

  let upCount = 0;
  let downCount = 0;
  let npsTotal = 0;
  let npsCount = 0;

  for (const entry of entries) {
    const ts = Date.parse(entry.createdAt);
    if (Number.isNaN(ts)) continue;
    if (ts < cutoff) continue;

    if (entry.kind === "thumbs") {
      if (entry.verdict === "up") upCount += 1;
      else if (entry.verdict === "down") downCount += 1;
    } else if (entry.kind === "nps" && typeof entry.score === "number") {
      npsTotal += entry.score;
      npsCount += 1;
    }
  }

  if (upCount === 0 && downCount === 0 && npsCount === 0) return "";

  const parts: string[] = [];
  if (upCount > 0 || downCount > 0) {
    parts.push(`${upCount} up, ${downCount} down.`);
  }
  if (npsCount > 0) {
    const avg = npsTotal / npsCount;
    const formatted = Number.isInteger(avg) ? avg.toFixed(1) : avg.toFixed(1);
    parts.push(`Avg NPS: ${formatted}.`);
  }

  const summary = `Last 7d: ${parts.join(" ")}`.trim();
  if (summary.length <= MAX_LEN) return summary;
  return summary.slice(0, MAX_LEN);
}
