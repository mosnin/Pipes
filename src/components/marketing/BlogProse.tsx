import type { ReactNode } from "react";

/**
 * BlogProse
 *
 * Typographic primitives for the article body. Posts compose paragraphs,
 * headings, lists, quotes and inline code through these components so the
 * look stays consistent and the column max-width stays sane.
 *
 * There is no markdown parser. Authors write JSX. The H2 / H3 accept an
 * `id` for in-page anchors so the right-rail mini-TOC can scroll to them.
 */

export interface BlogProseProps {
  children: ReactNode;
}

export function BlogProse({ children }: BlogProseProps) {
  return (
    <div className="flex flex-col gap-5 text-[#111]">{children}</div>
  );
}

// ── Headings ─────────────────────────────────────────────────────────────────

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="group t-h2 text-[#111] mt-10 mb-1 scroll-mt-24"
    >
      {children}
      {id ? (
        <a
          href={`#${id}`}
          aria-label="Link to section"
          className="ml-2 t-caption text-[#C7C7CC] opacity-0 group-hover:opacity-100 transition-opacity align-middle"
        >
          #
        </a>
      ) : null}
    </h2>
  );
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="t-h3 text-[#111] mt-6 mb-1 scroll-mt-24">
      {children}
    </h3>
  );
}

// ── Block text ───────────────────────────────────────────────────────────────

export function P({ children }: { children: ReactNode }) {
  return <p className="t-body text-[#3C3C43]">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#C7C7CC] t-body text-[#3C3C43]">
      {children}
    </ul>
  );
}

export function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="flex flex-col gap-2 pl-5 list-decimal marker:text-[#8E8E93] t-body text-[#3C3C43]">
      {children}
    </ol>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

// ── Pull quote ───────────────────────────────────────────────────────────────

export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/40 pl-5 pr-4 py-3 my-2 rounded-r-md">
      <p className="t-h3 font-medium text-[#111]">{children}</p>
    </blockquote>
  );
}

// ── Inline pieces ────────────────────────────────────────────────────────────

export function Inline({ children }: { children: ReactNode }) {
  return (
    <code className="inline-flex items-center bg-[#F5F5F7] px-1.5 py-0.5 rounded-md text-[13px] text-[#111] font-mono">
      {children}
    </code>
  );
}

export function A({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-indigo-600 hover:underline underline-offset-2"
    >
      {children}
    </a>
  );
}

// ── Bold inline ─────────────────────────────────────────────────────────────

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-[#111]">{children}</strong>;
}
