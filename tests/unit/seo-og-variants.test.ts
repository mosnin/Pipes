import { describe, expect, it } from "vitest";
import {
  OG_VARIANTS,
  isOgVariant,
  ogImageUrl,
  parseOgVariant,
} from "@/lib/seo/og-variants";

describe("OG variants", () => {
  it("exposes the full closed enum of seven variants", () => {
    expect(OG_VARIANTS).toEqual([
      "default",
      "pricing",
      "protocol",
      "docs",
      "use-case",
      "compare",
      "template",
    ]);
  });

  it("isOgVariant accepts known values and rejects junk", () => {
    expect(isOgVariant("pricing")).toBe(true);
    expect(isOgVariant("docs")).toBe(true);
    expect(isOgVariant("nope")).toBe(false);
    expect(isOgVariant(null)).toBe(false);
  });

  it("parseOgVariant falls back to default when input is missing or unknown", () => {
    expect(parseOgVariant(null)).toBe("default");
    expect(parseOgVariant("")).toBe("default");
    expect(parseOgVariant("garbage")).toBe("default");
    expect(parseOgVariant("template")).toBe("template");
  });

  it("ogImageUrl encodes the title query param", () => {
    const url = ogImageUrl({ title: "Pipes & Co" });
    expect(url).toContain("title=Pipes+%26+Co");
  });

  it("ogImageUrl includes subtitle when provided", () => {
    const url = ogImageUrl({ title: "Pricing", subtitle: "Per seat." });
    expect(url).toContain("subtitle=Per+seat.");
  });

  it("ogImageUrl omits the variant param for default to keep URLs short", () => {
    const url = ogImageUrl({ title: "Home", variant: "default" });
    expect(url).not.toContain("variant=");
  });

  it("ogImageUrl emits the variant param for non-default variants", () => {
    const url = ogImageUrl({ title: "Pricing", variant: "pricing" });
    expect(url).toContain("variant=pricing");
  });

  it("ogImageUrl produces a URL that points at /api/og", () => {
    const parsed = new URL(ogImageUrl({ title: "Docs", variant: "docs" }));
    expect(parsed.pathname).toBe("/api/og");
  });
});
