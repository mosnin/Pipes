"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Menu, X } from "@/components/ui/icon";
import { Mark } from "@/components/brand/logo";
import { CutButton } from "@/components/marketing/cut-button";
import { NAV } from "@/components/marketing/nav";
import { cn } from "@/lib/utils";

/* ==========================================================================
   The site header, as Company OS ships it: a floating bar that tightens and
   takes a border once the page scrolls, a menu under Templates listing the
   real starter templates, and an accordion sheet on narrow viewports.

   The scrolled bar is a solid raised surface, not a frosted one (anti-slop
   rule 4), and the scrolled state comes from an IntersectionObserver
   sentinel rather than a scroll listener.
   ========================================================================== */

function useStuck(): [boolean, (node: HTMLDivElement | null) => void] {
  const [stuck, setStuck] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const ref = (node: HTMLDivElement | null): void => {
    observer.current?.disconnect();
    if (!node) return;
    observer.current = new IntersectionObserver(
      ([entry]) => setStuck(!(entry?.isIntersecting ?? true)),
      { threshold: 0 },
    );
    observer.current.observe(node);
  };
  return [stuck, ref];
}

export function MarketingHeader(): ReactNode {
  const [stuck, sentinelRef] = useStuck();
  // The sheet remembers which route it was opened on, so a navigation closes
  // it without an effect writing state: on a new pathname the two disagree.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [accordion, setAccordion] = useState<string | null>(null);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const open = openOn === pathname;
  const setOpen = (next: boolean): void => setOpenOn(next ? pathname : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpenOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      <div className="fixed inset-x-0 top-0 z-50 px-4">
        <header
          data-stuck={stuck || open}
          className={cn(
            "mk-header mx-auto mt-4 flex h-[56px] w-full items-center justify-between px-6",
            "transition-[max-width,background-color,border-color,box-shadow] duration-[var(--dur-4)] ease-[var(--ease-emphasis)]",
            stuck || open
              ? "max-w-[1200px] rounded-12 border border-border bg-raised shadow-elev-2"
              : "max-w-[1360px] border border-transparent bg-transparent",
          )}
        >
          <div className="flex items-center gap-10">
            <Link
              href="/"
              aria-label="Pipes home"
              className="focus-ring-canvas flex items-center gap-4 rounded-4 text-ink focus-visible:outline-none"
            >
              <span className="inline-flex shrink-0 items-center" aria-hidden="true">
                <Mark size={24} />
                <motion.span
                  initial={false}
                  animate={{
                    width: stuck ? 0 : "auto",
                    marginLeft: stuck ? 0 : 8,
                    opacity: stuck ? 0 : 1,
                  }}
                  transition={{
                    duration: reduced ? 0 : 0.26,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="t-brand overflow-hidden whitespace-nowrap"
                >
                  pipes
                </motion.span>
              </span>
            </Link>
            <nav aria-label="Main" className="hidden lg:flex">
              <DesktopLinks pathname={pathname} />
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="t-mk-nav focus-ring-canvas hidden rounded-4 px-4 py-3 text-ink-2 transition-colors duration-[var(--dur-1)] hover:text-ink focus-visible:outline-none lg:inline-flex"
            >
              Log in
            </Link>
            <CutButton
              href="/signup?source=header"
              className="hidden sm:inline-flex"
              track={{ event: "signup_started", metadata: { source: "header" } }}
            >
              Start free
            </CutButton>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mk-mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="focus-ring-canvas flex size-[36px] items-center justify-center rounded-6 text-ink transition-colors duration-[var(--dur-1)] hover:bg-state-hover focus-visible:outline-none lg:hidden"
            >
              {open ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {open ? (
            <motion.div
              id="mk-mobile-menu"
              initial={reduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              className="mx-auto mt-2 max-h-[calc(100dvh-96px)] max-w-[1200px] overflow-y-auto rounded-12 border border-border bg-raised shadow-elev-3 lg:hidden"
            >
              <div className="flex flex-col p-6">
                {NAV.map((item) => {
                  const isOpen = accordion === item.id;
                  if (!item.children) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="t-body-strong border-b border-hairline py-6 text-ink-2 transition-colors duration-[var(--dur-1)] hover:text-ink"
                      >
                        {item.title}
                      </Link>
                    );
                  }
                  return (
                    <div key={item.id} className="border-b border-hairline">
                      <button
                        type="button"
                        onClick={() => setAccordion(isOpen ? null : item.id)}
                        aria-expanded={isOpen}
                        className="t-body-strong flex w-full items-center justify-between py-6 text-ink-2 transition-colors duration-[var(--dur-1)] hover:text-ink"
                      >
                        {item.title}
                        <ChevronDown
                          size={18}
                          aria-hidden="true"
                          className={cn(
                            "transition-transform duration-[var(--dur-2)] ease-[var(--ease-move)]",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-[var(--dur-2)] ease-[var(--ease-move)]",
                          isOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="flex flex-col gap-2 pb-5">
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="rounded-8 px-4 py-4 transition-colors duration-[var(--dur-1)] hover:bg-state-hover"
                            >
                              <span className="t-body-strong block text-ink">
                                All templates
                              </span>
                            </Link>
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setOpen(false)}
                                className="rounded-8 px-4 py-4 transition-colors duration-[var(--dur-1)] hover:bg-state-hover"
                              >
                                <span className="t-body-strong block text-ink">
                                  {child.title}
                                </span>
                                <span className="t-caption block text-ink-3">
                                  {child.description}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-col gap-4 pt-6">
                  <CutButton
                    href="/signup?source=header_menu"
                    track={{ event: "signup_started", metadata: { source: "header_menu" } }}
                  >
                    Start free
                  </CutButton>
                  <CutButton href="/login" variant="outline">
                    Log in
                  </CutButton>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

function DesktopLinks({ pathname }: { pathname: string }): ReactNode {
  const [active, setActive] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (id: string | null): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(id);
  };
  const scheduleClose = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActive(null), 120);
  };

  return (
    <div
      onMouseLeave={scheduleClose}
      onMouseEnter={() => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null);
      }}
      className="relative flex items-center gap-2"
    >
      {NAV.map((item) => {
        const current =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const base = cn(
          "t-mk-nav focus-ring-canvas flex items-center gap-2 rounded-4 px-4 py-3 transition-colors duration-[var(--dur-1)] focus-visible:outline-none",
          current || active === item.id
            ? "text-ink"
            : "text-ink-2 hover:text-ink",
        );
        return (
          <Link
            key={item.id}
            href={item.href}
            onMouseEnter={() => show(item.children ? item.id : null)}
            onFocus={() => show(item.children ? item.id : null)}
            aria-current={current ? "page" : undefined}
            aria-expanded={item.children ? active === item.id : undefined}
            className={base}
          >
            {item.title}
            {item.children ? (
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={cn(
                  "transition-transform duration-[var(--dur-2)] ease-[var(--ease-move)]",
                  active === item.id && "rotate-180",
                )}
              />
            ) : null}
          </Link>
        );
      })}
      <AnimatePresence>
        {active ? <MegaMenu key={active} id={active} /> : null}
      </AnimatePresence>
    </div>
  );
}

function MegaMenu({ id }: { id: string }): ReactNode {
  const item = NAV.find((n) => n.id === id);
  const reduced = useReducedMotion();
  if (!item?.children) return null;
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
      className="absolute -left-4 top-[44px] w-[520px] origin-top-left rounded-12 border border-border bg-overlay p-2 shadow-elev-3"
    >
      <div className="flex flex-col gap-1 rounded-8 bg-object p-2 ring-1 ring-hairline">
        {item.children.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            className="focus-ring flex flex-col gap-1 rounded-8 px-4 py-4 transition-colors duration-[var(--dur-1)] hover:bg-state-hover focus-visible:outline-none"
          >
            <span className="t-body-strong text-ink">{child.title}</span>
            <span className="t-caption text-ink-3">{child.description}</span>
          </Link>
        ))}
        <Link
          href={item.href}
          className="focus-ring t-body-strong rounded-8 px-4 py-4 text-ink-2 transition-colors duration-[var(--dur-1)] hover:bg-state-hover hover:text-ink focus-visible:outline-none"
        >
          All templates
        </Link>
      </div>
    </motion.div>
  );
}
