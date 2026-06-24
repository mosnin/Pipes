"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MegaMenuCard } from "./MegaMenuCard";
import type {
  CustomersMenu,
  DocsMenu,
  MenuPayload,
  ProductMenu,
  UseCasesMenu,
} from "@/lib/marketing/nav-data";

// Shared mega-menu panel. One panel, swappable contents.
//
// Animation: the OUTER container fades + lifts in once. When the active item
// changes, the inner contents cross-fade. This is what Apple and Vercel do:
// the panel feels stable, only the contents move.

const panelMotion = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: {
    opacity: { duration: 0.18 },
    y: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const },
  },
} as const;

const contentMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.14, ease: [0.2, 0.8, 0.2, 1] as const },
} as const;

export type MegaMenuProps = {
  activeId: string | null;
  payload: MenuPayload | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onItemClick: () => void;
};

export function MegaMenu({
  activeId,
  payload,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
}: MegaMenuProps) {
  const open = activeId !== null && payload !== null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mega-panel"
          initial={panelMotion.initial}
          animate={panelMotion.animate}
          exit={panelMotion.exit}
          transition={panelMotion.transition}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="absolute left-1/2 top-full z-40 mt-3 -translate-x-1/2"
          role="menu"
          aria-label="Mega menu"
        >
          <div className="w-[min(920px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-xl-token">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeId}
                initial={contentMotion.initial}
                animate={contentMotion.animate}
                exit={contentMotion.exit}
                transition={contentMotion.transition}
                className="p-7"
              >
                <MegaContent payload={payload} onItemClick={onItemClick} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// -- Per-shape renderers ------------------------------------------------------

function MegaContent({
  payload,
  onItemClick,
}: {
  payload: MenuPayload;
  onItemClick: () => void;
}) {
  switch (payload.kind) {
    case "product":
      return <ProductContent menu={payload} onItemClick={onItemClick} />;
    case "use-cases":
      return <UseCasesContent menu={payload} onItemClick={onItemClick} />;
    case "docs":
      return <DocsContent menu={payload} onItemClick={onItemClick} />;
    case "customers":
      return <CustomersContent menu={payload} onItemClick={onItemClick} />;
  }
}

function ProductContent({
  menu,
  onItemClick,
}: {
  menu: ProductMenu;
  onItemClick: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-7">
      <div className="col-span-12 md:col-span-5">
        <div className="flex flex-col gap-6">
          {menu.categories.map((cat) => (
            <div key={cat.heading}>
              <h3 className="t-overline text-[var(--color-ink-3)]">{cat.heading}</h3>
              <ul className="mt-2 flex flex-col" role="list">
                {cat.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      role="menuitem"
                      href={link.href}
                      onClick={onItemClick}
                      className="group flex flex-col rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                      <span className="t-label font-medium text-[var(--color-ink-1)]">
                        {link.label}
                      </span>
                      {link.description ? (
                        <span className="t-caption text-[var(--color-ink-3)]">
                          {link.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-12 md:col-span-7">
        <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
          {menu.featured.map((card) => (
            <MegaMenuCard
              key={card.href}
              href={card.href}
              eyebrow={card.eyebrow}
              title={card.title}
              body={card.body}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UseCasesContent({
  menu,
  onItemClick,
}: {
  menu: UseCasesMenu;
  onItemClick: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {menu.cards.map((card) => (
        <Link
          key={card.href}
          role="menuitem"
          href={card.href}
          onClick={onItemClick}
          className="group flex flex-col rounded-2xl border border-black/[0.04] bg-[var(--surface-muted)] p-4 transition-all duration-200 hover:bg-white hover:shadow-sm-token focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <h4 className="t-title text-[var(--color-ink-1)]">{card.title}</h4>
          <p className="mt-1.5 t-label text-[var(--color-ink-2)] leading-relaxed">
            {card.body}
          </p>
        </Link>
      ))}
    </div>
  );
}

function DocsContent({
  menu,
  onItemClick,
}: {
  menu: DocsMenu;
  onItemClick: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
      <div>
        <h3 className="t-overline text-[var(--color-ink-3)]">Quickstart</h3>
        <ul className="mt-2 flex flex-col" role="list">
          {menu.quickstart.map((link) => (
            <li key={link.href}>
              <Link
                role="menuitem"
                href={link.href}
                onClick={onItemClick}
                className="group flex flex-col rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span className="t-label font-medium text-[var(--color-ink-1)]">
                  {link.label}
                </span>
                {link.description ? (
                  <span className="t-caption text-[var(--color-ink-3)]">
                    {link.description}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="t-overline text-[var(--color-ink-3)]">What is new</h3>
        <ul className="mt-2 flex flex-col" role="list">
          {menu.whatsNew.map((link) => (
            <li key={link.href}>
              <Link
                role="menuitem"
                href={link.href}
                onClick={onItemClick}
                className="group flex flex-col rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span className="t-label font-medium text-[var(--color-ink-1)]">
                  {link.label}
                </span>
                {link.description ? (
                  <span className="t-caption text-[var(--color-ink-3)]">
                    {link.description}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CustomersContent({
  menu,
  onItemClick,
}: {
  menu: CustomersMenu;
  onItemClick: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {menu.cards.map((card, i) => (
        <Link
          key={`${card.persona}-${i}`}
          role="menuitem"
          href={card.href}
          onClick={onItemClick}
          className="group flex flex-col justify-between rounded-2xl border border-black/[0.04] bg-[var(--surface-muted)] p-5 transition-all duration-200 hover:bg-white hover:shadow-sm-token focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <p className="t-overline text-[var(--color-accent)]">{card.persona}</p>
          <blockquote className="mt-2 t-title text-[var(--color-ink-1)] leading-snug">
            {card.quote}
          </blockquote>
          <p className="mt-4 t-caption text-[var(--color-ink-3)]">{card.signature}</p>
        </Link>
      ))}
    </div>
  );
}
