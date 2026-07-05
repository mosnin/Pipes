import { describe, expect, it } from "vitest";
import {
  getAllPosts,
  getAllPostMetas,
  getAllTags,
  getPostBySlug,
  getRelatedPosts,
  getTocForPost,
  posts,
} from "@/lib/blog/posts";

describe("blog post registry", () => {
  it("exposes three seed posts", () => {
    expect(posts.length).toBe(3);
    expect(getAllPosts().length).toBe(3);
  });

  it("returns posts sorted newest first", () => {
    const all = getAllPosts();
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].date >= all[i].date).toBe(true);
    }
  });

  it("includes all three seed slugs", () => {
    const slugs = new Set(getAllPosts().map((p) => p.slug));
    expect(slugs.has("plan-first-agent")).toBe(true);
    expect(slugs.has("why-we-built-pipes")).toBe(true);
    expect(slugs.has("eval-gates-deep-dive")).toBe(true);
  });

  it("looks up posts by slug", () => {
    const p = getPostBySlug("plan-first-agent");
    expect(p).not.toBeNull();
    expect(p?.title).toContain("plan-first agent");
  });

  it("returns null for an unknown slug", () => {
    expect(getPostBySlug("not-real")).toBeNull();
  });

  it("strips the body from getAllPostMetas", () => {
    const metas = getAllPostMetas();
    for (const m of metas) {
      expect("body" in m).toBe(false);
      expect(m.slug.length).toBeGreaterThan(0);
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.excerpt.length).toBeGreaterThan(0);
      expect(m.tags.length).toBeGreaterThan(0);
      expect(m.readingTimeMin).toBeGreaterThan(0);
    }
  });

  it("collects unique sorted tags", () => {
    const tags = getAllTags();
    expect(tags).toContain("Engineering");
    expect(tags).toContain("Company");
    expect(tags).toContain("Agent");
    // Sorted alphabetically
    const sorted = [...tags].sort((a, b) => a.localeCompare(b));
    expect(tags).toEqual(sorted);
  });

  it("returns up to n related posts ranked by tag overlap", () => {
    const target = getPostBySlug("plan-first-agent");
    expect(target).not.toBeNull();
    if (target === null) return;
    const related = getRelatedPosts(target, 3);
    expect(related.length).toBeLessThanOrEqual(3);
    // The post itself must not appear in its own related set.
    expect(related.find((r) => r.slug === target.slug)).toBeUndefined();
    // Eval gates shares both tags; it should be first.
    expect(related[0]?.slug).toBe("eval-gates-deep-dive");
  });

  it("returns a TOC for posts that declare one", () => {
    const toc = getTocForPost("plan-first-agent");
    expect(toc.length).toBeGreaterThan(0);
    for (const entry of toc) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("returns an empty TOC for unknown slugs", () => {
    expect(getTocForPost("nope")).toEqual([]);
  });

  it("uses realistic author names with a role", () => {
    for (const p of getAllPosts()) {
      expect(p.author.name.length).toBeGreaterThan(2);
      expect(p.author.role.length).toBeGreaterThan(2);
      expect(/Pipes/.test(p.author.role)).toBe(true);
    }
  });

  it("each post body is a function component", () => {
    for (const p of getAllPosts()) {
      expect(typeof p.body).toBe("function");
    }
  });
});
