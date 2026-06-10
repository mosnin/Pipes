import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlogPostCard } from "@/components/marketing/BlogPostCard";
import type { BlogPostMeta } from "@/lib/blog/types";

const POST: BlogPostMeta = {
  slug: "test-post",
  title: "A real engineering post",
  excerpt: "An honest description of what we built and why.",
  author: { name: "Mira Patel", role: "Staff engineer, Pipes" },
  date: "2026-05-01",
  tags: ["Engineering", "Agent"],
  readingTimeMin: 7,
};

describe("BlogPostCard", () => {
  it("renders title, excerpt, tags and author byline", () => {
    render(<BlogPostCard post={POST} />);
    expect(screen.getByText("A real engineering post")).toBeTruthy();
    expect(
      screen.getByText("An honest description of what we built and why."),
    ).toBeTruthy();
    expect(screen.getByText("Engineering")).toBeTruthy();
    expect(screen.getByText("Agent")).toBeTruthy();
    expect(screen.getByText("Mira Patel")).toBeTruthy();
    expect(screen.getByText("7 min")).toBeTruthy();
  });

  it("links to /blog/<slug>", () => {
    const { container } = render(<BlogPostCard post={POST} />);
    const link = container.querySelector(`a[href="/blog/${POST.slug}"]`);
    expect(link).not.toBeNull();
  });

  it("marks the default variant in the dataset", () => {
    render(<BlogPostCard post={POST} />);
    const article = screen.getByTestId(`blog-post-card-${POST.slug}`);
    expect(article.getAttribute("data-variant")).toBe("default");
  });

  it("renders the featured variant with a 'Latest' overline", () => {
    render(<BlogPostCard post={POST} variant="featured" />);
    const article = screen.getByTestId(`blog-post-card-${POST.slug}`);
    expect(article.getAttribute("data-variant")).toBe("featured");
    expect(screen.getByText("Latest")).toBeTruthy();
    expect(screen.getByText("Read the post")).toBeTruthy();
  });

  it("shows initials derived from the author's name", () => {
    render(<BlogPostCard post={POST} />);
    expect(screen.getByText("MP")).toBeTruthy();
  });
});
