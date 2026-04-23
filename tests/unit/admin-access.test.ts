import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("admin access allowlist", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses explicit PIPES_ADMIN_ALLOWLIST values", async () => {
    process.env.PIPES_ADMIN_ALLOWLIST = "ADMIN@pipes.local, support@pipes.local ";
    process.env.PIPES_USE_MOCKS = "false";

    const { canAccessAdmin, getAdminAllowlist } = await import("@/lib/admin/access");

    expect(getAdminAllowlist()).toEqual(["admin@pipes.local", "support@pipes.local"]);
    expect(canAccessAdmin("admin@pipes.local")).toBe(true);
    expect(canAccessAdmin("owner@pipes.local")).toBe(false);
  });

  it("falls back to mock owner when running in mock mode", async () => {
    delete process.env.PIPES_ADMIN_ALLOWLIST;
    process.env.PIPES_USE_MOCKS = "true";

    const { canAccessAdmin, getAdminAllowlist } = await import("@/lib/admin/access");

    expect(getAdminAllowlist()).toEqual(["owner@pipes.local"]);
    expect(canAccessAdmin("OWNER@pipes.local")).toBe(true);
  });
});
