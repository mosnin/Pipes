"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, BookOpen, X } from "lucide-react";
import { DocsSidebar, type DocsNavCategory } from "@/components/marketing/DocsSidebar";
import { DocsRightRail, type DocsRailHeading } from "@/components/marketing/DocsRightRail";
import { DocsSearchTrigger } from "@/components/marketing/DocsSearchTrigger";
import { useScrollSpy } from "@/lib/marketing/useScrollSpy";

/**
 * DocsLayout
 *
 * Three-column layout with sticky sidebar, main column, and a sticky right rail
 * showing an "On this page" mini-TOC. A thin indigo reading-progress bar pins
 * to the very top of the viewport.
 *
 * On screens <lg the sidebar collapses behind a "Browse" button that opens a
 * slide-in drawer; the right rail is hidden.
 *
 * The header and footer of the docs page (title block, "View on GitHub" link)
 * are rendered as children of `header`.
 */

export interface DocsLayoutProps {
  categories: ReadonlyArray<DocsNavCategory>;
  headings: ReadonlyArray<DocsRailHeading>;
  header?: ReactNode;
  children: ReactNode;
  githubHref?: string;
}

export function DocsLayout({
  categories,
  headings,
  header,
  children,
  githubHref = "https://github.com/pipes-ai/pipes",
}: DocsLayoutProps) {
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const activeId = useScrollSpy(ids, 120);
  const [mobileOpen, setMobileOpen] = useState(false);
  const progress = useReadingProgress();
  const reduced = useReducedMotion();

  return (
    <div className="bg-white">
      {/* Reading progress bar — pinned to top of viewport */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-transparent pointer-events-none"
      >
        <motion.div
          className="h-full bg-[#4F46E5] origin-left"
          style={{ width: "100%" }}
          animate={{ scaleX: progress }}
          transition={reduced ? { duration: 0 } : { duration: 0.08, ease: "linear" }}
        />
      </div>

      {/* Header */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 min-w-0">{header}</div>
          <div className="flex items-center gap-3 flex-wrap">
            <DocsSearchTrigger categories={categories} />
            <Link
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.14] bg-white px-3 h-9 t-label font-semibold text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02] transition-colors"
            >
              View on GitHub
              <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile "Browse" trigger row */}
      <div className="lg:hidden border-b border-black/[0.06] bg-white sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open docs navigation"
            className="inline-flex items-center gap-2 h-9 rounded-md border border-black/[0.08] bg-white px-3 t-label font-medium text-[#3C3C43] hover:border-black/[0.14]"
          >
            <BookOpen size={14} aria-hidden="true" />
            Browse
          </button>
          {activeId ? (
            <span className="t-caption text-[#8E8E93] truncate">
              {headings.find((h) => h.id === activeId)?.label ?? ""}
            </span>
          ) : null}
        </div>
      </div>

      {/* Three-column body */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_220px] gap-8">
          {/* Left sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin pr-2">
              <DocsSidebar categories={categories} activeId={activeId} />
            </div>
          </aside>

          {/* Main column */}
          <article className="min-w-0 max-w-[760px]">{children}</article>

          {/* Right rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin pl-2">
              <DocsRightRail headings={headings} activeId={activeId} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDocsDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        categories={categories}
        activeId={activeId}
      />
    </div>
  );
}

// ── Reading progress hook (scaleX between 0..1) ──────────────────────────────

function useReadingProgress(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    function compute(): void {
      ticking = false;
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const total = Math.max(1, doc.scrollHeight - window.innerHeight);
      setV(Math.max(0, Math.min(1, scrolled / total)));
    }
    function onScroll(): void {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(compute);
    }
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return v;
}

// ── Mobile drawer ────────────────────────────────────────────────────────────

interface MobileDocsDrawerProps {
  open: boolean;
  onClose: () => void;
  categories: ReadonlyArray<DocsNavCategory>;
  activeId: string | null;
}

function MobileDocsDrawer({
  open,
  onClose,
  categories,
  activeId,
}: MobileDocsDrawerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Auto-close after the user picks an entry (clicks anywhere in the nav)
  function handleNavClick(): void {
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Docs navigation"
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed inset-0 z-[100] flex flex-col bg-white lg:hidden"
          data-testid="docs-mobile-drawer"
        >
          <div className="flex h-14 items-center justify-between px-5 border-b border-black/[0.06]">
            <p className="t-title text-[#111]">Docs</p>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close docs navigation"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#3C3C43] hover:bg-black/[0.04]"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto px-5 py-6"
            onClick={handleNavClick}
          >
            <DocsSidebar categories={categories} activeId={activeId} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
