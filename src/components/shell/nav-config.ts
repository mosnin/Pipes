import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  CirclePlay,
  ClipboardList,
  Code2,
  CreditCard,
  Gauge,
  History,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  MessageSquarePlus,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Stamp,
  UserRound,
  Users,
  Workflow,
  type LucideIcon
} from "@/components/ui/icon";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** A live count drawn right-aligned in the row, hidden at zero. */
  count?: "approvals";
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
  adminOnly?: boolean;
}

/** One map of the product, shared by the rail, the breadcrumb and the search palette. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Workflows", icon: Workflow },
      { href: "/runs", label: "Runs", icon: CirclePlay },
      { href: "/approvals", label: "Approvals", icon: Stamp, count: "approvals" },
      { href: "/templates", label: "Templates", icon: LayoutGrid },
      { href: "/onboarding", label: "Get started", icon: ListChecks, exact: true }
    ]
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/account", label: "Account", icon: UserRound },
      { href: "/settings/collaboration", label: "Members", icon: Users },
      { href: "/settings/tokens", label: "API tokens", icon: KeyRound },
      { href: "/settings/connections", label: "Connections", icon: Plug },
      { href: "/settings/agents", label: "Connect an agent", icon: Bot },
      { href: "/settings/audit", label: "Audit log", icon: History },
      { href: "/settings/trust", label: "Trust", icon: ShieldCheck },
      { href: "/settings/operations", label: "Agent tuning", icon: SlidersHorizontal },
      { href: "/settings/billing", label: "Billing", icon: CreditCard },
      { href: "/settings/usage", label: "Usage", icon: BarChart3 },
      { href: "/settings/feedback", label: "Feedback", icon: MessageSquarePlus }
    ]
  },
  {
    label: "Operator",
    adminOnly: true,
    items: [
      { href: "/admin", label: "Support", icon: LifeBuoy, exact: true },
      { href: "/admin/insights", label: "Insights", icon: Gauge },
      { href: "/admin/release", label: "Release", icon: Activity },
      { href: "/admin/issues", label: "Issues", icon: ClipboardList }
    ]
  }
];

export const FOOTER_ITEMS: NavItem[] = [
  { href: "/protocol", label: "Protocol", icon: Code2, exact: true },
  { href: "/docs", label: "Docs", icon: BookOpen, exact: true }
];

export function navGroupsFor(isAdmin: boolean): NavGroup[] {
  return NAV_GROUPS.filter((group) => isAdmin || !group.adminOnly);
}

export function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The nav entry the current path lives under, for the breadcrumb. */
export function findNavItem(pathname: string): { group?: string; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) if (isActive(item, pathname)) return { group: group.label, item };
  }
  for (const item of FOOTER_ITEMS) if (isActive(item, pathname)) return { item };
  return null;
}
