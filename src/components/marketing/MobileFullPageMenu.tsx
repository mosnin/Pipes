"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, LayoutDashboard } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Wordmark } from "@/components/Wordmark";
import { navItems } from "@/lib/marketing/nav-data";
import type { NavItem } from "@/lib/marketing/nav-data";
import { clientRuntimeFlags } from "@/lib/env/client";

// Full-page mobile drawer.
//
// - Slides in from the right (translateX 100% to 0) over 320ms.
// - Body scroll locked while open.
// - Focus trapped between the close button and the last actionable element.
// - Esc closes.

export type MobileFullPageMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileFullPageMenu({ open, onClose }: MobileFullPageMenuProps) {
  const { isSignedIn } = useUser();
  const showDashboard = clientRuntimeFlags.useMocks || Boolean(isSignedIn);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusableRef = useRef<HTMLAnchorElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<Element | null>(null);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Focus management + Esc close + tab trap.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement;

    // Focus the close button as the initial target.
    const id = window.setTimeout(() => closeBtnRef.current?.focus(), 50);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", handleKey);
      const r = restoreFocusRef.current;
      if (r instanceof HTMLElement) r.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mobile-drawer"
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          initial={{ x: "100%" }}
          animate={{ x: "0%" }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed inset-0 z-[100] flex flex-col bg-white md:hidden"
          data-testid="mobile-drawer"
        >
          {/* Top bar */}
          <div className="flex h-14 items-center justify-between px-5 border-b border-black/[0.06]">
            <Link
              href="/"
              onClick={onClose}
              aria-label="Looper home"
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              <Wordmark size="lg" />
            </Link>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink-2)] hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable sections */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-8">
              {navItems.map((item) => (
                <MobileSection key={item.id} item={item} onNavigate={onClose} />
              ))}
            </nav>
          </div>

          {/* Bottom actions */}
          <div className="border-t border-black/[0.06] px-5 py-5">
            <div className="flex flex-col gap-3">
              {showDashboard ? (
                <Link
                  ref={lastFocusableRef}
                  href="/dashboard"
                  onClick={onClose}
                  className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#111] t-label font-semibold text-white hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <LayoutDashboard size={14} aria-hidden="true" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="flex h-12 items-center justify-center rounded-full border border-black/[0.08] t-label font-medium text-[var(--color-ink-1)] hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Log in
                  </Link>
                  <Link
                    ref={lastFocusableRef}
                    href="/signup"
                    onClick={onClose}
                    className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#111] t-label font-semibold text-white hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Start free
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------

function MobileSection({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  // Direct items render as a single full-width row.
  if (item.menu.kind === "direct") {
    return (
      <div>
        <Link
          href={item.menu.href}
          onClick={onNavigate}
          className="flex min-h-[56px] items-center justify-between rounded-2xl px-1 t-h3 text-[var(--color-ink-1)] hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {item.label}
        </Link>
      </div>
    );
  }

  const rows = collectRows(item);

  return (
    <section>
      <h3 className="t-overline text-[var(--color-ink-3)]">{item.label}</h3>
      <ul className="mt-2 flex flex-col" role="list">
        {rows.map((row, idx) => (
          <li key={`${row.href}-${idx}`}>
            <Link
              href={row.href}
              onClick={onNavigate}
              className="flex min-h-[56px] flex-col justify-center rounded-xl px-2 py-2 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="t-title text-[var(--color-ink-1)]">{row.title}</span>
              {row.subtitle ? (
                <span className="mt-0.5 t-caption text-[var(--color-ink-3)]">
                  {row.subtitle}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Flatten any mega-menu payload to a uniform set of rows so the mobile drawer
// stays a single-level list (no nested toggles, per spec).
type Row = { href: string; title: string; subtitle?: string };

function collectRows(item: NavItem): Row[] {
  const menu = item.menu;
  switch (menu.kind) {
    case "product": {
      const rows: Row[] = [];
      for (const cat of menu.categories) {
        for (const link of cat.links) {
          rows.push({ href: link.href, title: link.label, subtitle: link.description });
        }
      }
      return rows;
    }
    case "use-cases":
      return menu.cards.map((c) => ({ href: c.href, title: c.title, subtitle: c.body }));
    case "docs":
      return [
        ...menu.quickstart.map((l) => ({
          href: l.href,
          title: l.label,
          subtitle: l.description,
        })),
        ...menu.whatsNew.map((l) => ({
          href: l.href,
          title: l.label,
          subtitle: l.description,
        })),
      ];
    case "customers":
      return menu.cards.map((c) => ({
        href: c.href,
        title: c.persona,
        subtitle: c.signature,
      }));
    case "direct":
      return [{ href: menu.href, title: item.label }];
  }
}
