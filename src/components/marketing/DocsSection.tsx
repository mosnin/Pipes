"use client";

import { useState, type ReactNode } from "react";
import { Link2, Check } from "lucide-react";

/**
 * DocsSection
 *
 * A long-form section. Renders an h2 with an in-page anchor and a hover-only
 * copy-anchor button. Clicking the button copies the full URL (including
 * the #slug fragment) to the clipboard and flashes a "Copied" state for
 * 1.2 s.
 */

export interface DocsSectionProps {
  id: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}

export function DocsSection({ id, title, eyebrow, children }: DocsSectionProps) {
  return (
    <section
      id={id}
      data-docs-section={id}
      className="scroll-mt-24 mb-16 first:mt-0"
    >
      {eyebrow ? (
        <p className="t-overline text-[#4F46E5] mb-2">{eyebrow}</p>
      ) : null}
      <DocsHeading id={id} level={2}>
        {title}
      </DocsHeading>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * DocsHeading
 *
 * Reusable heading with anchor link affordance. Level 2 is used by
 * DocsSection. Level 3 can be used inside the body of a section.
 */

export interface DocsHeadingProps {
  id: string;
  level?: 2 | 3;
  children: ReactNode;
}

export function DocsHeading({ id, level = 2, children }: DocsHeadingProps) {
  const [copied, setCopied] = useState(false);

  function onCopy(e: React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      });
    }
  }

  const headingClass =
    level === 2
      ? "t-h2 text-[#111] tracking-tight"
      : "t-h3 text-[#111] mt-8 mb-2";

  const Tag: "h2" | "h3" = level === 2 ? "h2" : "h3";

  return (
    <div className="group/heading flex items-baseline gap-2 relative">
      <Tag id={id} className={`${headingClass} scroll-mt-24`}>
        {children}
      </Tag>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Anchor link copied" : "Copy anchor link"}
        className="opacity-0 group-hover/heading:opacity-100 focus-visible:opacity-100 transition-opacity inline-flex items-center justify-center w-6 h-6 rounded-md text-[#8E8E93] hover:bg-black/[0.04] hover:text-[#111]"
      >
        {copied ? (
          <Check size={12} aria-hidden="true" />
        ) : (
          <Link2 size={12} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
