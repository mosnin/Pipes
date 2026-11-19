import { templateMarketing } from "@/lib/public/content";

export type MenuChild = { title: string; href: string; description: string };
export type NavItem = {
  id: string;
  title: string;
  href: string;
  children?: MenuChild[];
};

/** The marketing routes, in the order a visitor meets them. Every one is a page. */
export const NAV: NavItem[] = [
  {
    id: "templates",
    title: "Templates",
    href: "/templates",
    children: templateMarketing.map((template) => ({
      title: template.title,
      href: `/templates/${template.slug}`,
      description: `${template.category}, ${template.complexity}. ${template.preview}.`,
    })),
  },
  { id: "use-cases", title: "Use cases", href: "/use-cases" },
  { id: "protocol", title: "Protocol", href: "/protocol" },
  { id: "pricing", title: "Pricing", href: "/pricing" },
  { id: "compare", title: "Compare", href: "/compare" },
  { id: "docs", title: "Docs", href: "/docs" },
];

export const FOOTER_COLUMNS: {
  title: string;
  links: { href: string; label: string }[];
}[] = [
  {
    title: "Product",
    links: [
      { href: "/templates", label: "Templates" },
      { href: "/use-cases", label: "Use cases" },
      { href: "/pricing", label: "Pricing" },
      { href: "/compare", label: "Compare" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/protocol", label: "Protocol" },
      { href: "/protocol#connect", label: "Connect an agent" },
      { href: "/protocol#mcp", label: "MCP tools" },
      { href: "/protocol#rest", label: "REST API" },
      { href: "/docs", label: "Docs" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup?source=footer", label: "Create a workspace" },
    ],
  },
];
