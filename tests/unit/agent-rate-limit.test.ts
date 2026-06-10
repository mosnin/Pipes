import { afterEach, describe, expect, it } from "vitest";
import {
  acquireSlot,
  checkRateLimit,
  getInFlight,
  releaseSlot,
  resetInFlight,
  resetRateLimit
} from "@/lib/agent/rate-limit";

afterEach(() => {
  resetRateLimit();
  resetInFlight();
});

describe("checkRateLimit", () => {
  it("allows up to the limit and rejects the next request inside the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) {
      const r = checkRateLimit("k:a", 5, 60_000, now + i);
      expect(r.ok).toBe(true);
    }
    const blocked = checkRateLimit("k:a", 5, 60_000, now + 5);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets the bucket after the window elapses", () => {
    const now = 2_000_000;
    for (let i = 0; i < 3; i += 1) checkRateLimit("k:b", 3, 1_000, now);
    const blocked = checkRateLimit("k:b", 3, 1_000, now + 100);
    expect(blocked.ok).toBe(false);
    const allowed = checkRateLimit("k:b", 3, 1_000, now + 1_001);
    expect(allowed.ok).toBe(true);
  });

  it("isolates buckets by key", () => {
    const now = 3_000_000;
    for (let i = 0; i < 3; i += 1) checkRateLimit("k:c1", 3, 60_000, now);
    const blocked = checkRateLimit("k:c1", 3, 60_000, now);
    expect(blocked.ok).toBe(false);
    const otherUser = checkRateLimit("k:c2", 3, 60_000, now);
    expect(otherUser.ok).toBe(true);
  });

  it("retryAfterMs is roughly the time remaining in the window", () => {
    const now = 4_000_000;
    checkRateLimit("k:d", 1, 10_000, now);
    const blocked = checkRateLimit("k:d", 1, 10_000, now + 4_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(6_000);
  });

  it("resetRateLimit() clears all keys", () => {
    const now = 5_000_000;
    checkRateLimit("k:e", 1, 10_000, now);
    expect(checkRateLimit("k:e", 1, 10_000, now).ok).toBe(false);
    resetRateLimit();
    expect(checkRateLimit("k:e", 1, 10_000, now).ok).toBe(true);
  });
});

describe("acquireSlot / releaseSlot", () => {
  it("blocks a second slot when the limit is one", () => {
    expect(acquireSlot("u:1", 1)).toBe(true);
    expect(acquireSlot("u:1", 1)).toBe(false);
    expect(getInFlight("u:1")).toBe(1);
    releaseSlot("u:1");
    expect(getInFlight("u:1")).toBe(0);
    expect(acquireSlot("u:1", 1)).toBe(true);
  });

  it("isolates slots by key", () => {
    expect(acquireSlot("u:2", 1)).toBe(true);
    expect(acquireSlot("u:3", 1)).toBe(true);
    expect(acquireSlot("u:2", 1)).toBe(false);
    expect(acquireSlot("u:3", 1)).toBe(false);
  });

  it("releaseSlot is idempotent past zero", () => {
    releaseSlot("u:never");
    expect(getInFlight("u:never")).toBe(0);
  });

  it("resetInFlight clears all keys", () => {
    acquireSlot("u:4", 1);
    resetInFlight();
    expect(getInFlight("u:4")).toBe(0);
    expect(acquireSlot("u:4", 1)).toBe(true);
  });

  it("supports limits greater than one", () => {
    expect(acquireSlot("u:5", 2)).toBe(true);
    expect(acquireSlot("u:5", 2)).toBe(true);
    expect(acquireSlot("u:5", 2)).toBe(false);
    releaseSlot("u:5");
    expect(acquireSlot("u:5", 2)).toBe(true);
  });
});
