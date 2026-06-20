"use client";

import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { RouteTransition } from "@/components/marketing/RouteTransition";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/pricing",     label: "Pricing"      },
      { href: "/templates",   label: "Starters"     },
      { href: "/changelog",   label: "Changelog"    },
      { href: "/protocol",    label: "Loop API"     },
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
      { href: "/protocol", label: "Loop API reference" },
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
              className="group relative flex items-center w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
              aria-label="Looper home"
            >
              <Wordmark size="lg" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 -bottom-0.5 h-[2px] origin-left scale-x-0 bg-indigo-600 transition-transform duration-150 group-hover:scale-x-100"
              />
            </Link>

            <p className="t-caption text-[#8E8E93] leading-relaxed max-w-[14rem]">
              Describe your system. Watch it build itself.
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
            &copy; {year} Looper, Inc. All rights reserved.
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
      {/* Skip-to-content link for keyboard / AT users (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-[#111] focus:px-3 focus:py-1.5 focus:rounded-md focus:shadow-md focus:ring-2 focus:ring-indigo-500"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="flex-1">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <MarketingFooter />
    </div>
  );
}
