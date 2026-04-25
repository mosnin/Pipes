"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GitBranch, Menu, X, ArrowRight, Zap } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/templates", label: "Templates" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/compare", label: "Compare" },
  { href: "/protocol", label: "Protocol" },
  { href: "/docs", label: "Docs" },
] as const;

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/templates", label: "Templates" },
      { href: "/use-cases", label: "Use cases" },
      { href: "/compare", label: "Compare" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/protocol", label: "Protocol" },
      { href: "/blog", label: "Blog" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

function MarketingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "bg-white/90 backdrop-blur-lg shadow-sm border-b border-slate-200/60"
          : "bg-white/80 backdrop-blur-md border-b border-slate-100",
      ].join(" ")}
      role="banner"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Desktop bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">

          {/* Brand */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
            aria-label="Pipes – go to homepage"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
              <GitBranch size={16} className="text-white" aria-hidden="true" />
            </span>
            <span className="text-[1.125rem] font-bold tracking-tight text-slate-900 group-hover:text-indigo-700 transition-colors">
              Pipes
            </span>
          </Link>

          {/* Center nav — hidden on mobile */}
          <nav
            className="hidden md:flex items-center gap-0.5"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions — hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Start Building
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Hamburger — visible on mobile only */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            {menuOpen
              ? <X size={20} aria-hidden="true" />
              : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile menu                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={[
          "md:hidden overflow-hidden border-t border-slate-100 bg-white transition-all duration-200 ease-in-out",
          menuOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <nav
          className="mx-auto max-w-7xl px-4 pt-3 pb-5 flex flex-col gap-0.5"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}

          {/* CTA row */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <Link
              href="/login"
              className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Start Building
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">

        {/* ---------------------------------------------------------------- */}
        {/* Top: brand column + link columns                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-4 lg:gap-x-16">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-5">
            <Link
              href="/"
              className="group flex items-center gap-2.5 w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
              aria-label="Pipes – go to homepage"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 group-hover:bg-indigo-700 transition-colors">
                <GitBranch size={16} className="text-white" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-700 transition-colors">
                Pipes
              </span>
            </Link>

            <p className="text-sm text-slate-500 leading-relaxed max-w-[16rem]">
              Build, orchestrate, and ship data pipelines — visually. No glue code required.
            </p>

            {/* Mini CTA */}
            <Link
              href="/signup"
              className="group inline-flex w-fit items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-100 hover:shadow-indigo-200 transition-all duration-150"
            >
              <Zap size={13} aria-hidden="true" className="text-indigo-200 group-hover:text-white transition-colors" />
              Start for free
            </Link>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <div key={heading} className="flex flex-col gap-4">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
                {heading}
              </h3>
              <ul className="flex flex-col gap-2.5" role="list">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus-visible:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Bottom bar: copyright + legal links                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-14 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 tracking-wide">
            &copy; {year} Pipes, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {(
              [
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
                { href: "/status", label: "Status" },
              ] as const
            ).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingNavbar />
      <main className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
