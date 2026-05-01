"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: "/templates",  label: "Templates" },
  { href: "/use-cases",  label: "Customers" },
  { href: "/protocol",   label: "Protocol"  },
  { href: "/pricing",    label: "Pricing"   },
  { href: "/docs",       label: "Docs"      },
  { href: "/changelog",  label: "Changelog" },
] as const;

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/pricing",     label: "Pricing"      },
      { href: "/templates",   label: "Templates"    },
      { href: "/changelog",   label: "Changelog"    },
      { href: "/protocol",    label: "Protocol"     },
    ],
  },
  {
    heading: "Use cases",
    links: [
      { href: "/use-cases",                          label: "All use cases"   },
      { href: "/use-cases/multi-agent-systems",      label: "Multi-agent"     },
      { href: "/use-cases/automation-workflows",     label: "Automation"      },
      { href: "/use-cases/technical-system-design",  label: "Architecture"    },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/docs",     label: "Documentation" },
      { href: "/protocol", label: "API reference" },
      { href: "/blog",     label: "Blog"          },
      { href: "/status",   label: "System status" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about",    label: "About"   },
      { href: "/customers", label: "Customers" },
      { href: "/careers",  label: "Careers" },
      { href: "/contact",  label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms",   label: "Terms"   },
      { href: "/security", label: "Security" },
      { href: "/dpa",     label: "DPA"     },
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
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "bg-white/85 backdrop-blur-xl border-b border-black/[0.08] shadow-xs"
          : "bg-white/70 backdrop-blur-md border-b border-transparent",
      ].join(" ")}
      role="banner"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-6">

          {/* Brand */}
          <Link
            href="/"
            className="flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
            aria-label="Pipes home"
          >
            <span className="t-h3 font-bold tracking-[-0.04em] text-[#111]">
              Pipes
            </span>
          </Link>

          {/* Center nav */}
          <nav
            className="hidden lg:flex items-center gap-0.5"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative rounded-md px-2.5 py-1.5 t-label font-medium text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center rounded-md px-2.5 py-1.5 t-label font-medium text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#111] px-3 py-1.5 t-label font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Start building
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {/* Hamburger */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04] active:bg-black/[0.07] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={[
          "lg:hidden overflow-hidden border-t border-black/[0.06] bg-white transition-all duration-200 ease-in-out",
          menuOpen ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0",
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
              className="flex items-center rounded-md px-3 py-2.5 t-label font-medium text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}

          <div className="mt-4 pt-4 border-t border-black/[0.06] flex flex-col gap-2">
            <Link
              href="/login"
              className="flex items-center justify-center rounded-md border border-black/[0.08] px-4 py-2.5 t-label font-medium text-[#3C3C43] hover:border-black/[0.14] hover:bg-black/[0.03] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-1.5 rounded-md bg-[#111] hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2.5 t-label font-semibold text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Start building
              <ArrowRight size={13} aria-hidden="true" />
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
    <footer className="border-t border-black/[0.08] bg-white" role="contentinfo">
      {/* Newsletter strip */}
      <div className="border-b border-black/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-md">
              <h3 className="t-h3 text-[#111]">Get the changelog in your inbox</h3>
              <p className="mt-1 t-label text-[#8E8E93]">
                One short email a month. New features, design notes, no spam.
              </p>
            </div>
            <form
              className="flex w-full max-w-md gap-2"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Newsletter signup"
            >
              <label className="sr-only" htmlFor="footer-email">Email address</label>
              <input
                id="footer-email"
                type="email"
                required
                placeholder="you@company.com"
                className="flex-1 h-10 rounded-md border border-black/[0.08] bg-white px-3 t-label text-[#111] placeholder:text-[#8E8E93] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-[#111] px-4 t-label font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-12">

          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
              aria-label="Pipes home"
            >
              <span className="t-h3 font-bold tracking-[-0.04em] text-[#111]">
                Pipes
              </span>
            </Link>

            <p className="t-caption text-[#8E8E93] leading-relaxed max-w-[14rem]">
              One map your team and your agents both read.
            </p>
          </div>

          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <div key={heading} className="flex flex-col gap-3">
              <h3 className="t-overline text-[#8E8E93]">{heading}</h3>
              <ul className="flex flex-col gap-2" role="list">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="t-label text-[#3C3C43] hover:text-[#111] transition-colors focus:outline-none focus-visible:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="mt-14 pt-6 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="t-caption text-[#8E8E93]">
            &copy; {year} Pipes, Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 t-caption text-[#8E8E93]">
              <span
                aria-hidden="true"
                className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"
              />
              All systems operational
            </span>
            {(
              [
                { href: "https://twitter.com/pipes", label: "Twitter" },
                { href: "https://github.com/pipes-ai", label: "GitHub" },
                { href: "https://linkedin.com/company/pipes", label: "LinkedIn" },
              ] as const
            ).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="t-caption text-[#8E8E93] hover:text-[#111] transition-colors"
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
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
