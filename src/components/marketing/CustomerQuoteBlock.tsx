"use client";

import type { FeaturedQuote } from "@/lib/marketing/customers-data";

/**
 * CustomerQuoteBlock
 *
 * Large pull quote with persona attribution. Display-sized body in the
 * primary ink; attribution in t-label below an inline rule.
 */

export interface CustomerQuoteBlockProps {
  quote: FeaturedQuote;
}

export function CustomerQuoteBlock({ quote }: CustomerQuoteBlockProps) {
  return (
    <figure className="mx-auto max-w-4xl">
      <blockquote
        className="text-[#111]"
        style={{
          fontSize: 40,
          lineHeight: 1.15,
          letterSpacing: "-0.03em",
          fontWeight: 600,
        }}
      >
        {quote.body}
      </blockquote>
      <figcaption className="mt-10 flex items-center gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 t-label font-semibold text-violet-700">
          {quote.persona
            .split(" ")
            .map((p) => p.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <div className="flex flex-col">
          <span className="t-label font-semibold text-[#111]">
            {quote.persona}
          </span>
          <span className="t-caption text-[#8E8E93]">
            {quote.role}, {quote.company}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
