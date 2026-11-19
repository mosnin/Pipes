"use client";

/**
 * The one icon set: lucide, as Podium uses it. Every icon in Pipes is imported
 * from here so a change of set stays a one-file decision.
 *
 * Podium's rules (docs/DESIGN.md, Iconography): 15 to 18px with a 1.7 to 1.75
 * stroke in navigation, 16px in buttons, one icon per row, never mixed sets.
 */
import type { ReactNode } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

export type { LucideIcon, LucideProps };
export type Icon = LucideIcon;
export type IconProps = LucideProps;

/** Kept so existing call sites compile; lucide needs no context. */
export function IconProvider({ children }: { children: ReactNode }): ReactNode {
  return children;
}

/** Navigation icons are the same stroke icons as everywhere else in Podium. */
export function NavIcons({ children }: { children: ReactNode }): ReactNode {
  return children;
}

export {
  Activity,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CirclePlay,
  ClipboardList,
  Clock,
  Code2,
  Contrast,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileInput,
  FileQuestion,
  FileText,
  Funnel,
  Gauge,
  GitBranch,
  Hash,
  History,
  House,
  Inbox,
  Info,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  Menu,
  MessageSquarePlus,
  Minus,
  Monitor,
  Moon,
  MoreHorizontal,
  OctagonAlert,
  PanelLeft,
  PencilLine,
  Plug,
  Plus,
  Rocket,
  RotateCcw,
  ScanSearch,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Star,
  Sun,
  Tag,
  Target,
  Timer,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
  User,
  UserPlus,
  UserRound,
  Users,
  Waypoints,
  Workflow,
  X,
  Zap
} from "lucide-react";
