import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlogPostLayout } from "@/components/marketing/BlogPostLayout";
import type { BlogPost, BlogPostMeta, BlogTocEntry } from "@/lib/blog/types";

const POST: BlogPost = {
  slug: "test-post",
  title: "Plan-first agents and what we learned",
  excerpt:
    "What changed when we asked the agent to write its plan before it built anything.",
  author: { name: "Mira Patel", role: "Staff engineer, Pipes" },
  date: "2026-04-08",
  tags: ["Engineering", "Agent"],
  readingTimeMin: 8,
  body: () => <p>Body paragraph.</p>,
};

const TOC: ReadonlyArray<BlogTocEntry> = [
  { id: "intro", label: "Introduction" },
  { id: "contract", label: "The contract" },
  { id: "next", label: "What is next" },
];

const RELATED: ReadonlyArray<BlogPostMeta> = [
  {
    slug: "why-we-built-pipes",
    title: "Why we built Pipes",
    excerpt: "The origin story.",
    author: { name: "Devansh Rao", role: "Founder, Pipes" },
    date: "2025-12-12",
    tags: ["Company"],
    readingTimeMin: 6,
  },
  {
    slug: "eval-gates",
    title: "Eval gates",
    excerpt: "How we keep the agent honest.",
    author: { name: "Mira Patel", role: "Staff engineer, Pipes" },
    date: "2026-05-21",
    tags: ["Engineering"],
    readingTimeMin: 10,
  },
];

describe("BlogPostLayout", () => {
  it("renders the reading progress bar", () => {
    render(
      <BlogPostLayout post={POST} toc={TOC} related={RELATED}>
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByTestId("blog-reading-progress")).toBeTruthy();
  });

  it("renders the title, excerpt, and tag pills in the header", () => {
    render(
      <BlogPostLayout post={POST} toc={TOC} related={RELATED}>
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(
      screen.getByText("Plan-first agents and what we learned"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "What changed when we asked the agent to write its plan before it built anything.",
      ),
    ).toBeTruthy();
    // Engineering and Agent appear on the header. They may also appear on the
    // related card; we just need at least one of each.
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agent").length).toBeGreaterThan(0);
  });

  it("renders the table of contents from the toc prop", () => {
    render(
      <BlogPostLayout post={POST} toc={TOC} related={RELATED}>
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByText("On this page")).toBeTruthy();
    expect(screen.getByText("Introduction")).toBeTruthy();
    expect(screen.getByText("The contract")).toBeTruthy();
    expect(screen.getByText("What is next")).toBeTruthy();
  });

  it("renders share buttons", () => {
    render(
      <BlogPostLayout post={POST} toc={TOC} related={RELATED}>
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByLabelText("Copy link")).toBeTruthy();
    expect(screen.getByLabelText("Share")).toBeTruthy();
    expect(screen.getByLabelText("Share by email")).toBeTruthy();
  });

  it("renders related posts", () => {
    render(
      <BlogPostLayout post={POST} toc={TOC} related={RELATED}>
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByText("Related posts")).toBeTruthy();
    expect(screen.getByText("Why we built Pipes")).toBeTruthy();
    expect(screen.getByText("Eval gates")).toBeTruthy();
  });

  it("includes the newsletter signup panel", () => {
    render(
      <BlogPostLayout post={POST} toc={TOC} related={RELATED}>
        <p>Body</p>
      </BlogPostLayout>,
    );
    expect(screen.getByTestId("newsletter-signup")).toBeTruthy();
    expect(screen.getByText("Subscribe to the Looper notes.")).toBeTruthy();
  });

  it("includes a back link to /blog", () => {
    const { container } = render(
      <BlogPostLayout post={POST} toc={TOC} related={RELATED}>
        <p>Body</p>
      </BlogPostLayout>,
    );
    const links = container.querySelectorAll('a[href="/blog"]');
    expect(links.length).toBeGreaterThan(0);
  });
});
