"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { BlogPostMeta } from "@/lib/blog/types";
import { BlogTagPill } from "./BlogTagPill";
import { BlogAuthorBlock } from "./BlogAuthorBlock";
import { cn } from "@/lib/utils";

/**
 * BlogPostCard
 *
 * Article card used on the blog index and in related-post strips.
 *
 * Two variants:
 *  - "default" — fits a 3-col grid. Tag pill, title, excerpt, byline.
 *  - "featured" — wide 2-col layout for the most recent post on the index.
 */

export interface BlogPostCardProps {
  post: BlogPostMeta;
  variant?: "default" | "featured";
  className?: string;
}

export function BlogPostCard({
  post,
  variant = "default",
  className,
}: BlogPostCardProps) {
  const reduced = useReducedMotion();
  const href = `/blog/${post.slug}`;

  if (variant === "featured") {
    return (
      <motion.article
        data-testid={`blog-post-card-${post.slug}`}
        data-variant="featured"
        whileHover={reduced ? undefined : { scale: 1.005 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-white",
          "hover:border-violet-200 transition-colors",
          className,
        )}
      >
        <Link
          href={href}
          className="grid grid-cols-1 lg:grid-cols-2 gap-0"
          aria-label={`Read ${post.title}`}
        >
          <div
            aria-hidden="true"
            className="relative h-56 lg:h-full bg-violet-50 brand-pattern-bg overflow-hidden"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 60% at 30% 30%, rgba(79,70,229,0.18) 0%, rgba(79,70,229,0) 70%)",
              }}
            />
            <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex w-fit items-center h-6 px-2.5 rounded-full t-caption font-medium border bg-white/80 backdrop-blur text-[#3C3C43] border-black/[0.06]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-8 lg:p-10 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-3">
              <span className="t-overline text-violet-600">Latest</span>
              <h2 className="t-h1 text-[#111] line-clamp-3">{post.title}</h2>
              <p className="t-body text-[#3C3C43] line-clamp-3">
                {post.excerpt}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <BlogAuthorBlock
                author={post.author}
                date={post.date}
                readingTimeMin={post.readingTimeMin}
                compact
              />
              <span className="inline-flex items-center gap-1.5 t-label font-semibold text-violet-600">
                Read the post
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      data-testid={`blog-post-card-${post.slug}`}
      data-variant="default"
      whileHover={reduced ? undefined : { scale: 1.01 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-6 flex flex-col gap-4",
        "hover:border-violet-200 transition-colors",
        className,
      )}
    >
      <Link
        href={href}
        className="absolute inset-0 z-10"
        aria-label={`Read ${post.title}`}
      />
      <div className="flex flex-wrap gap-1.5">
        {post.tags.map((tag) => (
          <BlogTagPill key={tag}>{tag}</BlogTagPill>
        ))}
      </div>
      <h3 className="t-h3 text-[#111] line-clamp-2">{post.title}</h3>
      <p className="t-body text-[#3C3C43] line-clamp-3">{post.excerpt}</p>
      <div className="mt-auto pt-3 border-t border-black/[0.04]">
        <BlogAuthorBlock
          author={post.author}
          date={post.date}
          readingTimeMin={post.readingTimeMin}
          compact
        />
      </div>
    </motion.article>
  );
}
