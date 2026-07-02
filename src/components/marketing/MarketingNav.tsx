"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, ArrowRight, LayoutDashboard } from "lucide-react";
import { useOptionalUser } from "@/lib/auth/client";
import { Wordmark } from "@/components/Wordmark";
import { MegaMenu } from "./MegaMenu";
import { MobileFullPageMenu } from "./MobileFullPageMenu";
import { navItems } from "@/lib/marketing/nav-data";
import type { MenuPayload } from "@/lib/marketing/nav-data";
import { clientRuntimeFlags } from "@/lib/env/client";

// MarketingNav
//
// Pill-style sticky nav. Tapping or hovering an item with a mega menu opens
// a shared panel; moving between items cross-fades the contents.
//
// State model
//   - `scrolled`        – true past 32px of scroll. Drives blur + bg + shadow.
//   - `activeId`        – id of the open menu (null = closed). React-state
//                         driven so keyboard works (not CSS :hover).
//   - `mobileOpen`      – mobile drawer state.
//
// Grace delay: on mouse-leave we wait 240ms before closing, so the cursor
// can travel from the trigger pill into the panel without losing the menu.

const CLOSE_GRACE_MS = 240;
const SCROLL_THRESHOLD = 32;

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isSignedIn } = useOptionalUser();
  const showDashboard = clientRuntimeFlags.useMocks || Boolean(isSignedIn);

  const closeTimerRef = useRef<number | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Set true briefly when closing via Esc so the trigger can refocus without
  // re-opening through its onFocus handler.
  const suppressOpenRef = useRef<boolean>(false);

  // Scroll listener.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer once the viewport is desktop-wide.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close mega menu on Esc.
  useEffect(() => {
    if (activeId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveId(null);
        const node = triggerRefs.current[activeId];
        if (node) {
          suppressOpenRef.current = true;
          node.focus();
          // Release the suppression on the next frame.
          window.setTimeout(() => {
            suppressOpenRef.current = false;
          }, 0);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveId(null);
      closeTimerRef.current = null;
    }, CLOSE_GRACE_MS);
  }, [clearCloseTimer]);

  const openMenu = useCallback(
    (id: string) => {
      if (suppressOpenRef.current) return;
      clearCloseTimer();
      setActiveId(id);
    },
    [clearCloseTimer],
  );

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setActiveId(null);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  // The payload to render in the shared panel.
  const activePayload = useMemo<MenuPayload | null>(() => {
    if (!activeId) return null;
    const item = navItems.find((i) => i.id === activeId);
    if (!item || item.menu.kind === "direct") return null;
    return item.menu;
  }, [activeId]);

  return (
    <header
      className="sticky top-0 z-50 w-full pt-4"
      role="banner"
      data-testid="marketing-nav-header"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* The pill */}
          <div
            className={[
              "flex h-14 items-center justify-between gap-2 rounded-full border px-2 backdrop-blur-2xl transition-all duration-[240ms]",
              scrolled
                ? "border-black/[0.06] bg-white/90 shadow-md-token"
                : "border-black/[0.06] bg-white/70 shadow-sm-token",
            ].join(" ")}
            data-scrolled={scrolled ? "true" : "false"}
            data-testid="marketing-nav-pill"
          >
            {/* Left: wordmark */}
            <Link
              href="/"
              aria-label="Looper home"
              className="ml-2 inline-flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Wordmark size="sm" />
            </Link>

            {/* Center: nav items (desktop only) */}
            <nav
              className="hidden md:flex items-center gap-0.5"
              aria-label="Main navigation"
              onMouseLeave={scheduleClose}
            >
              {navItems.map((item) => {
                if (item.menu.kind === "direct") {
                  return (
                    <Link
                      key={item.id}
                      href={item.menu.href}
                      className="inline-flex items-center rounded-full px-4 py-1.5 text-[14px] font-medium text-[var(--color-ink-2)] transition-colors duration-150 hover:bg-black/[0.04] hover:text-[var(--color-ink-1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                      onMouseEnter={() => {
                        // Hovering a direct item should close any open menu
                        // after the grace, so navigating across the bar feels
                        // continuous.
                        if (activeId !== null) scheduleClose();
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                }
                const open = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      triggerRefs.current[item.id] = el;
                    }}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-controls="marketing-nav-mega"
                    onMouseEnter={() => openMenu(item.id)}
                    onFocus={() => openMenu(item.id)}
                    onClick={() => (open ? closeMenu() : openMenu(item.id))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (open) closeMenu();
                        else openMenu(item.id);
                      }
                    }}
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                      open
                        ? "bg-black/[0.04] text-[var(--color-ink-1)]"
                        : "text-[var(--color-ink-2)] hover:bg-black/[0.04] hover:text-[var(--color-ink-1)]",
                    ].join(" ")}
                  >
                    {item.label}
                    <ChevronDown
                      size={12}
                      aria-hidden="true"
                      className={[
                        "transition-transform duration-200",
                        open ? "rotate-180 opacity-70" : "opacity-40",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </nav>

            {/* Right: auth actions (desktop) + hamburger (mobile) */}
            <div className="flex items-center gap-1">
              {showDashboard ? (
                <Link
                  href="/dashboard"
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-1.5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <LayoutDashboard size={13} aria-hidden="true" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden md:inline-flex items-center rounded-full px-4 py-1.5 text-[14px] font-medium text-[var(--color-ink-2)] transition-colors duration-150 hover:bg-black/[0.04] hover:text-[var(--color-ink-1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-1.5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    Start free
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-controls="marketing-mobile-drawer"
                className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink-2)] hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                data-testid="marketing-nav-hamburger"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Mega menu — shared panel below the pill */}
          <div
            id="marketing-nav-mega"
            className="hidden md:block"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
          >
            <MegaMenu
              activeId={activeId}
              payload={activePayload}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
              onItemClick={closeMenu}
            />
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div id="marketing-mobile-drawer">
        <MobileFullPageMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
    </header>
  );
}
