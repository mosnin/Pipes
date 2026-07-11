"use client";

import { motion, useReducedMotion } from "framer-motion";
import { smoothScrollToId } from "@/lib/marketing/useScrollSpy";

export interface DocsRailHeading {
  id: string;
  label: string;
  level: 2 | 3;
}

export interface DocsRightRailProps {
  headings: ReadonlyArray<DocsRailHeading>;
  activeId: string | null;
}

/**
 * DocsRightRail
 *
 * "On this page" mini-TOC. Highlights the active heading; animates the
 * highlight chip when the active id changes (respects reduced motion).
 */

export function DocsRightRail({ headings, activeId }: DocsRightRailProps) {
  const reduced = useReducedMotion();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string): void {
    e.preventDefault();
    smoothScrollToId(id);
  }

  return (
    <nav
      aria-label="On this page"
      className="flex flex-col gap-2"
    >
      <p className="t-overline text-[#8E8E93] mb-1">On this page</p>
      <ul className="flex flex-col gap-0.5 border-l border-black/[0.06]">
        {headings.map((h) => {
          const isActive = activeId === h.id;
          return (
            <li key={h.id} className="relative">
              {isActive ? (
                <motion.span
                  layoutId="docs-rail-active"
                  aria-hidden="true"
                  className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-[#4F46E5]"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }
                  }
                />
              ) : null}
              <a
                href={`#${h.id}`}
                onClick={(e) => handleClick(e, h.id)}
                className={[
                  "block py-1 pl-3 pr-2 t-caption transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-r",
                  h.level === 3 ? "pl-6" : "",
                  isActive
                    ? "text-[#4F46E5] font-medium"
                    : "text-[#8E8E93] hover:text-[#111]",
                ].join(" ")}
              >
                {h.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
