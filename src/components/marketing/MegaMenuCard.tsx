"use client";

import Link from "next/link";

// Featured card used inside the Product mega menu.
//
// Visual: a soft surface-muted block with eyebrow, title, body, and a subtle
// hover lift. No decorative icons; the words carry the meaning.

export type MegaMenuCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
};

export function MegaMenuCard({ href, eyebrow, title, body }: MegaMenuCardProps) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="group block rounded-2xl border border-black/[0.04] bg-[var(--surface-muted)] p-5 transition-all duration-200 hover:bg-white hover:shadow-sm-token focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <p className="t-overline text-[var(--color-accent)]">{eyebrow}</p>
      <h4 className="mt-2 t-title text-[var(--color-ink-1)]">{title}</h4>
      <p className="mt-1.5 t-label text-[var(--color-ink-2)] leading-relaxed">{body}</p>
      <span
        aria-hidden="true"
        className="mt-3 inline-flex items-center gap-1 t-label font-medium text-[var(--color-accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        Read more
      </span>
    </Link>
  );
}
