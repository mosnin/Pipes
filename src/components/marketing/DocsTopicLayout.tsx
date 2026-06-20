import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";

/**
 * DocsTopicLayout
 *
 * A focused, single-column layout for one docs topic page. Header with a
 * "back to docs" affordance, the prose, and prev/next navigation between
 * sibling topics. Kept deliberately simpler than the three-column index.
 */

export interface DocsTopicNeighbor {
  href: string;
  label: string;
}

export interface DocsTopicLayoutProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  prev?: DocsTopicNeighbor;
  next?: DocsTopicNeighbor;
}

export function DocsTopicLayout({ eyebrow, title, intro, children, prev, next }: DocsTopicLayoutProps) {
  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 t-label font-medium text-[#8E8E93] hover:text-[#111] transition-colors"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            All docs
          </Link>
          <p className="mt-5 t-overline text-[#4F46E5]">{eyebrow}</p>
          <h1 className="mt-1 t-h1 text-[#111]" style={{ letterSpacing: "-0.025em" }}>
            {title}
          </h1>
          <p className="mt-2 t-body text-[#3C3C43] max-w-2xl leading-relaxed">{intro}</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        <article className="min-w-0">{children}</article>

        {/* Prev / next */}
        {(prev || next) && (
          <nav className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-black/[0.06] pt-8">
            {prev ? (
              <Link
                href={prev.href}
                className="group rounded-2xl border border-black/[0.06] bg-white p-4 hover:border-indigo-300 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 t-caption text-[#8E8E93]">
                  <ArrowLeft size={12} aria-hidden="true" />
                  Previous
                </span>
                <span className="mt-1 block t-label font-semibold text-[#111] group-hover:text-indigo-700">
                  {prev.label}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={next.href}
                className="group rounded-2xl border border-black/[0.06] bg-white p-4 text-right hover:border-indigo-300 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 t-caption text-[#8E8E93] justify-end w-full">
                  Next
                  <ArrowRight size={12} aria-hidden="true" />
                </span>
                <span className="mt-1 block t-label font-semibold text-[#111] group-hover:text-indigo-700">
                  {next.label}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {/* Help line */}
        <div className="mt-8 flex items-center gap-2 t-caption text-[#8E8E93]">
          <span>Something unclear?</span>
          <Link href="/contact?source=docs" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
            Tell us
            <ArrowUpRight size={11} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
