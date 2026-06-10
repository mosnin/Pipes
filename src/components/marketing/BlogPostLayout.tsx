"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Link2, Mail, Share2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { useScrollSpy, smoothScrollToId } from "@/lib/marketing/useScrollSpy";
import { BlogReadingProgress } from "./BlogReadingProgress";
import { BlogAuthorBlock } from "./BlogAuthorBlock";
import { BlogTagPill } from "./BlogTagPill";
import { BlogPostCard } from "./BlogPostCard";
import { NewsletterSignup } from "./NewsletterSignup";
import { cn } from "@/lib/utils";
import type { BlogPostMeta, BlogTocEntry } from "@/lib/blog/types";

/**
 * BlogPostLayout
 *
 * The single-article shell. Top to bottom:
 *  1. Reading progress bar
 *  2. Header (tag pills, title, excerpt, byline) in a rounded surface
 *  3. Body column (max-w-[680px]) + sticky right rail with mini-TOC and
 *     share buttons
 *  4. Related posts strip (3 cards)
 *  5. Newsletter panel
 *  6. CTA strip linking back to /blog
 */

export interface BlogPostLayoutProps {
  // Accept the serializable metadata only. The body component is rendered
  // by the server page and passed as `children` so we never cross the
  // server -> client component boundary with a function prop.
  post: BlogPostMeta;
  toc: ReadonlyArray<BlogTocEntry>;
  related: ReadonlyArray<BlogPostMeta>;
  children: ReactNode;
}

export function BlogPostLayout({
  post,
  toc,
  related,
  children,
}: BlogPostLayoutProps) {
  const reduced = useReducedMotion();
  const tocIds = useMemo(() => toc.map((t) => t.id), [toc]);
  const activeId = useScrollSpy(tocIds, 96);

  return (
    <main className="min-h-screen bg-white">
      <BlogReadingProgress />

      {/* Back link */}
      <div className="px-4 sm:px-6 pt-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 t-label text-[#3C3C43] hover:text-[#111] transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All posts
          </Link>
        </div>
      </div>

      {/* Header surface */}
      <section className="px-4 sm:px-6 pt-4">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="relative overflow-hidden rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-16 sm:px-12 sm:py-20"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(60% 60% at 85% 20%, rgba(79,70,229,0.06) 0%, rgba(79,70,229,0) 70%)",
              }}
            />
            <div className="relative max-w-3xl flex flex-col gap-6">
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <BlogTagPill key={tag}>{tag}</BlogTagPill>
                ))}
              </div>
              <h1 className="t-display text-[#111]">{post.title}</h1>
              <p className="t-body text-[#3C3C43] max-w-2xl">{post.excerpt}</p>
              <BlogAuthorBlock
                author={post.author}
                date={post.date}
                readingTimeMin={post.readingTimeMin}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Body + right rail */}
      <section className="px-4 sm:px-6 mt-10 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-10">
            <article
              className="min-w-0 mx-auto w-full lg:mx-0"
              style={{ maxWidth: 680 }}
            >
              {children}
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin pr-2 flex flex-col gap-6">
                {toc.length > 0 ? (
                  <nav aria-label="On this page" className="flex flex-col gap-2">
                    <span className="t-overline text-[#8E8E93]">
                      On this page
                    </span>
                    <ul className="flex flex-col gap-1">
                      {toc.map((entry) => {
                        const active = entry.id === activeId;
                        return (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => smoothScrollToId(entry.id, 80)}
                              className={cn(
                                "block text-left w-full t-label px-2 py-1 rounded-md transition-colors",
                                active
                                  ? "text-[#111] bg-indigo-50/60 border-l-2 border-indigo-500"
                                  : "text-[#3C3C43] hover:text-[#111]",
                              )}
                            >
                              {entry.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                ) : null}

                <ShareRow title={post.title} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Related posts */}
      {related.length > 0 ? (
        <section className="px-4 sm:px-6 pb-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-6 gap-3">
              <div>
                <span className="t-overline text-[#8E8E93]">Read next</span>
                <h2 className="t-h2 text-[#111] mt-1">Related posts</h2>
              </div>
              <Link
                href="/blog"
                className="hidden sm:inline-flex items-center gap-1.5 t-label font-semibold text-indigo-600"
              >
                All posts
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {related.map((rel) => (
                <BlogPostCard key={rel.slug} post={rel} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Newsletter panel */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-7xl">
          <NewsletterSignup variant="panel" />
        </div>
      </section>

      {/* Footer CTA strip */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md">
              <h3 className="t-h3 text-[#111]">Describe your system.</h3>
              <p className="t-label text-[#3C3C43] mt-1">
                Open a fresh canvas. Type one sentence. The agent draws it.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-black/[0.14] bg-white t-label font-semibold text-[#111] hover:bg-black/[0.02] transition-colors"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                All posts
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-indigo-600 text-white t-label font-semibold hover:bg-indigo-700 transition-colors"
              >
                Try Pipes
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ── Share row ───────────────────────────────────────────────────────────────

function ShareRow({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link.");
    }
  }

  async function onShare(): Promise<void> {
    if (typeof window === "undefined") return;
    if ("share" in navigator && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: window.location.href });
      } catch {
        // user cancelled - silent
      }
      return;
    }
    void onCopy();
  }

  function mailto(): string {
    if (typeof window === "undefined") return "#";
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(window.location.href);
    return `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="t-overline text-[#8E8E93]">Share</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy link"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/[0.08] bg-white text-[#3C3C43] hover:border-indigo-300 hover:text-[#111] transition-colors"
        >
          <Link2 size={14} aria-hidden="true" />
          <span className="sr-only">{copied ? "Copied" : "Copy link"}</span>
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/[0.08] bg-white text-[#3C3C43] hover:border-indigo-300 hover:text-[#111] transition-colors"
        >
          <Share2 size={14} aria-hidden="true" />
          <span className="sr-only">Share</span>
        </button>
        <a
          href={mailto()}
          aria-label="Share by email"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/[0.08] bg-white text-[#3C3C43] hover:border-indigo-300 hover:text-[#111] transition-colors"
        >
          <Mail size={14} aria-hidden="true" />
          <span className="sr-only">Share by email</span>
        </a>
      </div>
    </div>
  );
}
