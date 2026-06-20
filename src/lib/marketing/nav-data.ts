// Typed mega-menu data for the marketing nav.
//
// Source data:
//   - Use cases come from `src/lib/public/content.ts` (the canonical public
//     content surface), so the nav stays in sync with the use-cases pages.
//   - Customer voices and other entries are authored here because the existing
//     marketing content surface does not expose them yet. Voice rules follow
//     `docs/audience.md` (one idea per sentence, no banned words, ASCII only).

import { useCases } from "@/lib/public/content";

export type NavLink = {
  href: string;
  label: string;
  description?: string;
};

export type NavCategory = {
  heading: string;
  links: NavLink[];
};

export type FeaturedCard = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
};

export type ProductMenu = {
  kind: "product";
  categories: NavCategory[];
  featured: FeaturedCard[];
};

export type UseCasesMenu = {
  kind: "use-cases";
  cards: Array<{ href: string; title: string; body: string }>;
};

export type DocsMenu = {
  kind: "docs";
  quickstart: NavLink[];
  whatsNew: NavLink[];
};

export type CustomersMenu = {
  kind: "customers";
  cards: Array<{ href: string; persona: string; quote: string; signature: string }>;
};

export type DirectItem = {
  kind: "direct";
  href: string;
};

export type MenuPayload = ProductMenu | UseCasesMenu | DocsMenu | CustomersMenu;

export type NavItem = {
  id: string;
  label: string;
  menu: MenuPayload | DirectItem;
};

// -- Product menu --------------------------------------------------------------

const productMenu: ProductMenu = {
  kind: "product",
  categories: [
    {
      heading: "Build",
      links: [
        { href: "/templates", label: "Starters", description: "Real systems to remix" },
        { href: "/docs/editor", label: "Editor", description: "Draw, drag, type" },
        { href: "/docs/schema", label: "Schema", description: "27 typed node kinds" },
      ],
    },
    {
      heading: "Run",
      links: [
        { href: "/docs/versions", label: "Versions", description: "Promote and roll back" },
        { href: "/docs/review", label: "Review", description: "Comment on any node" },
        { href: "/changelog", label: "Changelog", description: "What shipped this week" },
      ],
    },
    {
      heading: "Connect",
      links: [
        { href: "/protocol", label: "Loop API", description: "One MCP endpoint" },
        { href: "/docs/tokens", label: "Tokens", description: "Hand any agent a key" },
        { href: "/docs/import-export", label: "Import and export", description: "Read your graph anywhere" },
      ],
    },
  ],
  featured: [
    {
      href: "/templates/multi-agent-handoff",
      eyebrow: "Starter",
      title: "Multi-agent Handoff",
      body: "A planner hands off to an executor through a guard step.",
    },
    {
      href: "/protocol",
      eyebrow: "Loop API",
      title: "Every agent reads the same loop",
      body: "Hand a token to Claude, LangGraph, or AutoGen. They all read the same loop definition you built.",
    },
  ],
};

// -- Use cases menu (from canonical content) ----------------------------------

const useCasesMenu: UseCasesMenu = {
  kind: "use-cases",
  cards: useCases.map((u) => ({
    href: `/use-cases/${u.slug}`,
    title: u.title,
    body: u.fit,
  })),
};

// -- Docs menu ----------------------------------------------------------------

const docsMenu: DocsMenu = {
  kind: "docs",
  quickstart: [
    { href: "/docs", label: "Get started", description: "Type a sentence, watch it draw" },
    { href: "/docs/editor", label: "Editor tour", description: "Drag, edit, undo" },
    { href: "/docs/schema", label: "Schema reference", description: "Every node type" },
    { href: "/protocol", label: "Loop API", description: "Hand a token to any agent" },
  ],
  whatsNew: [
    { href: "/changelog", label: "Changelog", description: "Every week, one short note" },
    { href: "/blog", label: "Notes from the team", description: "Why we built it this way" },
  ],
};

// -- Customers menu -----------------------------------------------------------

const customersMenu: CustomersMenu = {
  kind: "customers",
  cards: [
    {
      href: "/customers",
      persona: "Staff engineer",
      quote: "I stopped redrawing the same diagram in three places.",
      signature: "Multi-agent team",
    },
    {
      href: "/customers",
      persona: "Tech lead",
      quote: "Review happens on the graph. Pull requests reference nodes by id.",
      signature: "Infra team",
    },
    {
      href: "/customers",
      persona: "Founder",
      quote: "I describe the system. The team and the agents read the same map.",
      signature: "Early stage",
    },
  ],
};

// -- Exported items list ------------------------------------------------------

export const navItems: readonly NavItem[] = [
  { id: "product", label: "Product", menu: productMenu },
  { id: "use-cases", label: "Use cases", menu: useCasesMenu },
  { id: "pricing", label: "Pricing", menu: { kind: "direct", href: "/pricing" } },
  { id: "docs", label: "Docs", menu: docsMenu },
  { id: "customers", label: "Customers", menu: customersMenu },
] as const;
