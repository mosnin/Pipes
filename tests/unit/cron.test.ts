import { describe, expect, it } from "vitest";
import { describeCronError, matches, nextFireBetween, parseCron } from "@/domain/triggers/cron";

const at = (iso: string) => new Date(iso);

describe("cron", () => {
  it("matches steps, ranges and lists", () => {
    const every15 = parseCron("*/15 * * * *");
    expect(matches(every15, at("2026-11-16T10:30:00Z"))).toBe(true);
    expect(matches(every15, at("2026-11-16T10:31:00Z"))).toBe(false);
    const weekdays9 = parseCron("0 9 * * 1-5");
    expect(matches(weekdays9, at("2026-11-16T09:00:00Z"))).toBe(true); // Monday
    expect(matches(weekdays9, at("2026-11-15T09:00:00Z"))).toBe(false); // Sunday
    expect(matches(parseCron("0 0 1,15 * *"), at("2026-11-15T00:00:00Z"))).toBe(true);
  });

  it("treats 7 as Sunday", () => {
    expect(matches(parseCron("0 12 * * 7"), at("2026-11-15T12:00:00Z"))).toBe(true);
  });

  it("finds the next fire time in a window", () => {
    expect(nextFireBetween("0 * * * *", at("2026-11-16T10:05:00Z"), at("2026-11-16T12:00:00Z"))?.toISOString()).toBe("2026-11-16T11:00:00.000Z");
    expect(nextFireBetween("0 * * * *", at("2026-11-16T10:05:00Z"), at("2026-11-16T10:59:00Z"))).toBeNull();
  });

  it("explains invalid expressions", () => {
    expect(describeCronError("every monday")).toMatch(/five fields/);
    expect(describeCronError("61 * * * *")).toMatch(/out of range/);
    expect(describeCronError("*/0 * * * *")).toMatch(/Invalid step/);
    expect(describeCronError("*/5 * * * *")).toBeNull();
  });
});
