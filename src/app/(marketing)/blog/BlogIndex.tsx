"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BlogPostCard } from "@/components/marketing/BlogPostCard";
import { BlogTagPill } from "@/components/marketing/BlogTagPill";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";
import { EmptyState, Button } from "@/components/ui";
import type { BlogPostMeta } from "@/lib/blog/types";

/**
 * BlogIndex
 *
 * Top: hero panel. Below: featured (newest) post in a wide card. Below
 * that: tag filter chips + 3-col grid of cards. Footer: newsletter CTA
 * strip.
 *
 * Posts arrive already sorted newest-first; the registry is the source
 * of order so we never sort here.
 */

interface BlogIndexProps {
  posts: ReadonlyArray<BlogPostMeta>;
  tags: ReadonlyArray<string>;
}

export function BlogIndex({ posts, tags }: BlogIndexProps) {
  const reduced = useReducedMotion();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const featured = posts[0] ?? null;
  const rest = posts.slice(1);

  const visible = useMemo(() => {
    if (activeTag === null) return rest;
    return rest.filter((p) => p.tags.includes(activeTag as never));
  }, [rest, activeTag]);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="relative overflow-hidden rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-14 sm:px-12 sm:py-20"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.6]"
              style={{
                backgroundImage:
                  "radial-gradient(60% 60% at 85% 20%, rgba(79,70,229,0.06) 0%, rgba(79,70,229,0) 70%)",
              }}
            />
            <div className="relative max-w-2xl flex flex-col gap-5">
              <span className="t-overline text-[#8E8E93]">Blog</span>
              <h1 className="t-display text-[#111]">Notes from the team.</h1>
              <p className="t-body text-[#3C3C43]">
                Posts about how we build Looper. Mostly engineering. Occasionally
                company.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured post */}
      {featured ? (
        <section className="px-4 sm:px-6 mt-10">
          <div className="mx-auto max-w-7xl">
            <BlogPostCard post={featured} variant="featured" />
          </div>
        </section>
      ) : null}

      {/* All posts header + filter chips */}
      <section className="px-4 sm:px-6 mt-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <span className="t-overline text-[#8E8E93]">Archive</span>
              <h2 className="t-h1 text-[#111] mt-1">All posts</h2>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter posts by tag"
              data-testid="blog-tag-filter"
            >
              <BlogTagPill
                active={activeTag === null}
                onClick={() => setActiveTag(null)}
                asButton
              >
                All
              </BlogTagPill>
              {tags.map((tag) => (
                <BlogTagPill
                  key={tag}
                  active={activeTag === tag}
                  onClick={() => setActiveTag(tag)}
                  asButton
                >
                  {tag}
                </BlogTagPill>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="No posts in this tag yet"
              description="Clear the filter to see the whole archive."
              action={
                <Button variant="outline" onPress={() => setActiveTag(null)}>
                  Show all
                </Button>
              }
            />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
            >
              <AnimatePresence mode="popLayout">
                {visible.map((post, idx) => (
                  <motion.div
                    key={post.slug}
                    layout
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    transition={{
                      duration: 0.3,
                      ease: [0.2, 0.8, 0.2, 1],
                      delay: reduced ? 0 : Math.min(idx, 9) * 0.03,
                    }}
                  >
                    <BlogPostCard post={post} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Newsletter CTA strip */}
      <section className="px-4 sm:px-6 mt-16 pb-20">
        <div className="mx-auto max-w-7xl">
          <NewsletterSignup variant="panel" />
        </div>
      </section>
    </main>
  );
}
