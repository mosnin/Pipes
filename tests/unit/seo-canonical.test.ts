import { describe, expect, it } from "vitest";
import { APP_BASE_URL, canonicalUrl } from "@/lib/seo/canonical";

describe("canonicalUrl", () => {
  it("returns an absolute URL with the configured base", () => {
    const url = canonicalUrl("/pricing");
    expect(url.startsWith(APP_BASE_URL.replace(/\/+$/, ""))).toBe(true);
    expect(url.endsWith("/pricing")).toBe(true);
  });

  it("prepends a leading slash when missing", () => {
    expect(canonicalUrl("docs")).toBe(`${APP_BASE_URL.replace(/\/+$/, "")}/docs`);
  });

  it("preserves a leading slash when present", () => {
    expect(canonicalUrl("/docs")).toBe(`${APP_BASE_URL.replace(/\/+$/, "")}/docs`);
  });

  it("treats an empty path as the root", () => {
    expect(canonicalUrl("")).toBe(`${APP_BASE_URL.replace(/\/+$/, "")}/`);
  });

  it("does not double up slashes when the path includes nesting", () => {
    const url = canonicalUrl("/use-cases/multi-agent-systems");
    expect(url).not.toContain("//use-cases");
    expect(url.endsWith("/use-cases/multi-agent-systems")).toBe(true);
  });

  it("produces a string that parses as a URL", () => {
    const parsed = new URL(canonicalUrl("/protocol"));
    expect(parsed.pathname).toBe("/protocol");
  });
});
