import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/logo";
import { ThemeChoice } from "@/components/theme-toggle";
import { FOOTER_COLUMNS } from "@/components/marketing/nav";

export function MarketingFooter(): ReactNode {
  return (
    <footer className="border-t border-border">
      <div className="mk-container flex flex-col gap-12 py-12">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="flex flex-col gap-6">
            <Link
              href="/"
              aria-label="Pipes home"
              className="focus-ring-canvas inline-flex w-fit rounded-4 focus-visible:outline-none"
            >
              <Wordmark />
            </Link>
            <p className="t-body max-w-[40ch] text-ink-2">
              Design, store and version the workflows your agents follow, and
              let any agent run them step by step over MCP.
            </p>
            <div className="w-fit">
              <ThemeChoice />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-6">
                <p className="t-label-caps text-ink-3">{column.title}</p>
                <ul className="flex flex-col gap-4">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="t-body focus-ring-canvas rounded-2 text-ink-2 transition-colors duration-[var(--dur-1)] hover:text-ink focus-visible:outline-none"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-caption text-ink-3">{new Date().getFullYear()} Pipes.</p>
          <p className="t-caption text-ink-3">
            Workflows for people and the agents that work beside them.
          </p>
        </div>
      </div>
    </footer>
  );
}
