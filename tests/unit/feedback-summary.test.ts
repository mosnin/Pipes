import { describe, expect, it } from "vitest";
import { summarizeFeedback } from "@/lib/agent/feedback-summary";
import type { FeedbackEntryRecord } from "@/lib/repositories/contracts";

const NOW = new Date("2026-05-04T12:00:00.000Z");

function thumbs(verdict: "up" | "down", daysAgo: number): FeedbackEntryRecord {
  const ts = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `fbk_${Math.random().toString(36).slice(2, 10)}`,
    userId: "usr_1",
    kind: "thumbs",
    verdict,
    createdAt: ts
  };
}

function nps(score: number, daysAgo: number): FeedbackEntryRecord {
  const ts = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `fbk_${Math.random().toString(36).slice(2, 10)}`,
    userId: "usr_1",
    kind: "nps",
    score,
    createdAt: ts
  };
}

describe("summarizeFeedback", () => {
  it("returns an empty string when no entries exist", () => {
    expect(summarizeFeedback([], { now: NOW })).toBe("");
  });

  it("returns an empty string when entries array is malformed", () => {
    expect(summarizeFeedback(undefined as unknown as FeedbackEntryRecord[], { now: NOW })).toBe("");
  });

  it("returns thumbs counts when only thumbs feedback exists", () => {
    const entries = [
      thumbs("up", 1),
      thumbs("up", 2),
      thumbs("up", 3),
      thumbs("up", 4),
      thumbs("up", 5),
      thumbs("down", 6),
      thumbs("down", 6)
    ];
    expect(summarizeFeedback(entries, { now: NOW })).toBe("Last 7d: 5 up, 2 down.");
  });

  it("returns avg NPS when only NPS feedback exists", () => {
    const entries = [nps(8, 1), nps(8, 2), nps(8, 3)];
    expect(summarizeFeedback(entries, { now: NOW })).toBe("Last 7d: Avg NPS: 8.0.");
  });

  it("combines thumbs and NPS when both are present", () => {
    const entries = [
      thumbs("up", 1),
      thumbs("up", 1),
      thumbs("up", 2),
      thumbs("up", 3),
      thumbs("up", 4),
      thumbs("down", 5),
      thumbs("down", 6),
      nps(9, 1),
      nps(7, 2)
    ];
    expect(summarizeFeedback(entries, { now: NOW })).toBe("Last 7d: 5 up, 2 down. Avg NPS: 8.0.");
  });

  it("excludes entries older than 7 days", () => {
    const entries = [
      thumbs("up", 1),
      thumbs("up", 2),
      thumbs("down", 8), // older than 7 days
      thumbs("down", 30) // way older
    ];
    expect(summarizeFeedback(entries, { now: NOW })).toBe("Last 7d: 2 up, 0 down.");
  });

  it("returns empty when all entries are older than 7 days", () => {
    const entries = [thumbs("up", 8), thumbs("down", 30), nps(10, 14)];
    expect(summarizeFeedback(entries, { now: NOW })).toBe("");
  });

  it("ignores entries with invalid timestamps", () => {
    const malformed: FeedbackEntryRecord = {
      id: "fbk_x",
      userId: "usr_1",
      kind: "thumbs",
      verdict: "up",
      createdAt: "not-a-date"
    };
    expect(summarizeFeedback([malformed, thumbs("up", 1)], { now: NOW })).toBe("Last 7d: 1 up, 0 down.");
  });

  it("ignores free_text entries (only counts thumbs and NPS)", () => {
    const free: FeedbackEntryRecord = {
      id: "fbk_t",
      userId: "usr_1",
      kind: "free_text",
      text: "the agent placed nodes too close",
      createdAt: new Date(NOW.getTime() - 60_000).toISOString()
    };
    expect(summarizeFeedback([free, thumbs("up", 1)], { now: NOW })).toBe("Last 7d: 1 up, 0 down.");
  });

  it("caps output at 160 characters", () => {
    const entries: FeedbackEntryRecord[] = [];
    for (let i = 0; i < 1000; i += 1) entries.push(thumbs("up", 1));
    const summary = summarizeFeedback(entries, { now: NOW });
    expect(summary.length).toBeLessThanOrEqual(160);
  });

  it("formats fractional NPS averages to one decimal", () => {
    const entries = [nps(7, 1), nps(8, 1), nps(9, 1)];
    // Avg is 8.0 exactly.
    expect(summarizeFeedback(entries, { now: NOW })).toBe("Last 7d: Avg NPS: 8.0.");

    const entries2 = [nps(7, 1), nps(8, 1)];
    // Avg is 7.5.
    expect(summarizeFeedback(entries2, { now: NOW })).toBe("Last 7d: Avg NPS: 7.5.");
  });
});
