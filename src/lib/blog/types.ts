import type { ComponentType } from "react";

/**
 * Blog domain types.
 *
 * Posts are authored as TSX modules and registered in `posts.ts`. No MDX
 * runtime — the body is just a React component. Each post declares its
 * metadata inline and exports a body component that renders article markup
 * through the BlogProse primitives.
 */

export type BlogTag = "Engineering" | "Agent" | "Product" | "Company";

export interface BlogAuthor {
  /** Full name, e.g. "Mira Patel". Used for the byline and avatar initials. */
  name: string;
  /** Role, e.g. "Staff engineer, Pipes". */
  role: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  author: BlogAuthor;
  /** ISO date, e.g. "2026-04-15". */
  date: string;
  tags: ReadonlyArray<BlogTag>;
  /** Whole-minute estimate shown next to the byline. */
  readingTimeMin: number;
}

export interface BlogPost extends BlogPostMeta {
  /**
   * The body of the article, rendered as a React component. Authors
   * compose paragraphs, headings, lists and code blocks through the
   * BlogProse primitives. The component receives no props.
   */
  body: ComponentType;
}

/**
 * A heading that the article body component declares so the right-rail
 * mini-TOC can list it. Authors return this list alongside their body
 * component when they want a richer TOC; the default behavior is to scrape
 * H2 ids from the rendered output, but a static list is more reliable.
 */
export interface BlogTocEntry {
  id: string;
  label: string;
}
