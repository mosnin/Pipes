import type { BlogPost, BlogPostMeta, BlogTocEntry } from "./types";
import {
  post as planFirstAgent,
  toc as planFirstAgentToc,
} from "./seed/post-plan-first-agent";
import {
  post as whyWeBuilt,
  toc as whyWeBuiltToc,
} from "./seed/post-why-we-built-pipes";
import {
  post as evalGates,
  toc as evalGatesToc,
} from "./seed/post-eval-gates-deep-dive";

/**
 * The blog post registry.
 *
 * Posts are TSX modules. We import them here and freeze the order so the
 * index page and the single-post page see the same list.
 *
 * Order: newest first. We sort by date once at module load time so
 * downstream consumers do not need to sort.
 */

const RAW_POSTS: ReadonlyArray<BlogPost> = [
  planFirstAgent,
  whyWeBuilt,
  evalGates,
];

const TOC_BY_SLUG: Record<string, ReadonlyArray<BlogTocEntry>> = {
  [planFirstAgent.slug]: planFirstAgentToc,
  [whyWeBuilt.slug]: whyWeBuiltToc,
  [evalGates.slug]: evalGatesToc,
};

function byDateDesc(a: BlogPost, b: BlogPost): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

export const posts: ReadonlyArray<BlogPost> = [...RAW_POSTS].sort(byDateDesc);

export function getAllPosts(): ReadonlyArray<BlogPost> {
  return posts;
}

export function getAllPostMetas(): ReadonlyArray<BlogPostMeta> {
  return posts.map(({ body: _body, ...meta }) => meta);
}

export function getPostBySlug(slug: string): BlogPost | null {
  return posts.find((p) => p.slug === slug) ?? null;
}

export function getTocForPost(slug: string): ReadonlyArray<BlogTocEntry> {
  return TOC_BY_SLUG[slug] ?? [];
}

/**
 * Pick `n` related posts ranked by tag overlap. Ties break by recency.
 * The post itself is never returned.
 */
export function getRelatedPosts(
  post: BlogPostMeta,
  n: number = 3,
): ReadonlyArray<BlogPostMeta> {
  const others = posts.filter((p) => p.slug !== post.slug);
  const scored = others.map((p) => {
    const overlap = p.tags.filter((t) => post.tags.includes(t)).length;
    return { post: p, overlap };
  });
  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return a.post.date < b.post.date ? 1 : -1;
  });
  return scored
    .slice(0, n)
    .map(({ post: p }) => {
      const { body: _body, ...meta } = p;
      return meta;
    });
}

/**
 * Unique tag list across all posts. Used for the filter chips on the
 * index page. Sorted alphabetically so the chip order is stable.
 */
export function getAllTags(): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const p of posts) {
    for (const t of p.tags) set.add(t);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
