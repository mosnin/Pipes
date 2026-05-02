"use client";

import type {
  CSSProperties,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Search } from "lucide-react";
import {
  Button as HeroButton,
  Input as HeroInput,
  TextArea as HeroTextArea,
  Card as HeroCard,
  Chip,
  Avatar,
  Tabs as HeroTabs,
  Tab,
  Table as HeroTable,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import type {
  ButtonRootProps,
  InputRootProps,
  TextAreaRootProps,
  ChipVariants,
} from "@heroui/react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export type ButtonProps = ButtonRootProps & {
  className?: string;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <HeroButton
      variant={variant}
      className={cn(className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type InputProps = InputRootProps & {
  className?: string;
};

export function Input({ className, ...props }: InputProps) {
  return <HeroInput className={cn(className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------

export type TextareaProps = TextAreaRootProps & {
  className?: string;
};

export function Textarea({ className, ...props }: TextareaProps) {
  return <HeroTextArea className={cn(className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Select  (kept as native <select> wrapper to preserve <option> children API)
// HeroUI Select uses a headless/RAC API incompatible with plain <option>
// children, so we keep a styled native select so callers don't break.
// ---------------------------------------------------------------------------

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label",
        "text-[#111] outline-none",
        "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Badge  (backed by HeroUI Chip)
// ---------------------------------------------------------------------------

type BadgeTone = "neutral" | "good" | "warn";

const TONE_TO_COLOR: Record<BadgeTone, ChipVariants["color"]> = {
  good: "success",
  warn: "warning",
  neutral: "default",
};

export type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <Chip
      color={TONE_TO_COLOR[tone]}
      variant="soft"
      size="sm"
      className={cn(className)}
    >
      {children}
    </Chip>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <HeroCard className={cn("bg-white border border-black/[0.08]", className)}>
      <HeroCard.Content className="p-4">{children}</HeroCard.Content>
    </HeroCard>
  );
}

// ---------------------------------------------------------------------------
// Panel  (Card with a header title)
// ---------------------------------------------------------------------------

export type PanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, children, className }: PanelProps) {
  return (
    <HeroCard className={cn("bg-white border border-black/[0.08]", className)}>
      <HeroCard.Header className="px-4 pt-4 pb-0">
        <HeroCard.Title className="t-label font-semibold text-[#111]">
          {title}
        </HeroCard.Title>
      </HeroCard.Header>
      <HeroCard.Content className="p-4">{children}</HeroCard.Content>
    </HeroCard>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export type SidebarProps = {
  children: ReactNode;
  className?: string;
};

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "w-64 bg-[#F5F5F7] border-r border-black/[0.06] p-4 min-h-screen flex flex-col",
        className,
      )}
    >
      {children}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

export type TopbarProps = {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function Topbar({ left, right, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex justify-between items-center border-b border-black/[0.08] bg-white px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-3">{left}</div>
      {right != null && <div className="flex items-center gap-3">{right}</div>}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export type TabsProps = {
  /** Tab labels. Each string becomes both the id and the displayed label. */
  items: string[];
  /** Currently selected tab key. */
  selectedKey?: string;
  onSelectionChange?: (key: string) => void;
  className?: string;
};

export function Tabs({ items, selectedKey, onSelectionChange, className }: TabsProps) {
  return (
    <HeroTabs
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelectionChange?.(String(key))}
      className={cn(className)}
    >
      <HeroTabs.List>
        {items.map((item) => (
          <Tab key={item} id={item}>
            {item}
          </Tab>
        ))}
      </HeroTabs.List>
    </HeroTabs>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export type TableProps = {
  headers: string[];
  rows: string[][];
  className?: string;
};

export function Table({ headers, rows, className }: TableProps) {
  return (
    <HeroTable className={cn(className)}>
      <HeroTable.Content>
        <TableHeader>
          {headers.map((h) => (
            <TableColumn key={h}>{h}</TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <TableCell key={`${rowIdx}-${cellIdx}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </HeroTable.Content>
    </HeroTable>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border border-dashed border-black/[0.12] rounded-xl p-10 text-center",
        "flex flex-col items-center gap-3",
        className,
      )}
    >
      <h3 className="t-label font-semibold text-[#111]">{title}</h3>
      <p className="t-caption text-[#8E8E93]">{description}</p>
      {action != null && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold text-[#111]">{title}</h1>
        {subtitle != null && (
          <p className="mt-1 t-caption text-[#8E8E93]">{subtitle}</p>
        )}
      </div>
      {actions != null && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

export type SectionHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeader({ title, description, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="t-title text-[#111]">{title}</h2>
      {description != null && (
        <p className="mt-0.5 t-caption text-[#8E8E93]">{description}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AvatarStack
// ---------------------------------------------------------------------------

export type AvatarStackProps = {
  names: string[];
  className?: string;
};

export function AvatarStack({ names, className }: AvatarStackProps) {
  return (
    <div className={cn("flex -space-x-2", className)}>
      {names.map((name) => (
        <Avatar
          key={name}
          size="sm"
          color="accent"
          className="ring-2 ring-white"
          title={name}
        >
          <Avatar.Fallback>{name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
        </Avatar>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommentBubble
// ---------------------------------------------------------------------------

export type CommentBubbleProps = {
  author: string;
  text: string;
  className?: string;
};

export function CommentBubble({ author, text, className }: CommentBubbleProps) {
  return (
    <article
      className={cn(
        "border-l-2 border-indigo-400 pl-3 py-1",
        className,
      )}
    >
      <strong className="block t-label font-semibold text-[#111]">{author}</strong>
      <p className="mt-0.5 t-label text-[#3C3C43]">{text}</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// NodeTypeBadge
// ---------------------------------------------------------------------------

export type NodeTypeBadgeProps = {
  type: string;
  className?: string;
};

export function NodeTypeBadge({ type, className }: NodeTypeBadgeProps) {
  return (
    <Chip variant="soft" size="sm" color="default" className={cn(className)}>
      {type}
    </Chip>
  );
}

// ---------------------------------------------------------------------------
// ValidationBadge
// ---------------------------------------------------------------------------

export type ValidationBadgeSeverity = "info" | "warning" | "error";

export type ValidationBadgeProps = {
  severity: ValidationBadgeSeverity;
  className?: string;
};

const SEVERITY_TO_COLOR: Record<ValidationBadgeSeverity, ChipVariants["color"]> = {
  info: "success",
  warning: "warning",
  error: "danger",
};

export function ValidationBadge({ severity, className }: ValidationBadgeProps) {
  return (
    <Chip
      color={SEVERITY_TO_COLOR[severity]}
      variant="soft"
      size="sm"
      className={cn(className)}
    >
      {severity}
    </Chip>
  );
}

export { Skeleton, SkeletonText, SkeletonCard } from "./Skeleton";

// ===========================================================================
// === Enterprise primitives (additive, do not modify exports above) =========
// ===========================================================================

// ---------------------------------------------------------------------------
// CardShell + CardHeader / CardBody / CardFooter
// Compose primitives that allow rich card layouts without auto-padding.
// ---------------------------------------------------------------------------

export type CardShellProps = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
};

export function CardShell({ children, className, padded = false }: CardShellProps) {
  return (
    <HeroCard className={cn("bg-white border border-black/[0.08]", className)}>
      {padded ? (
        <HeroCard.Content className="p-4">{children}</HeroCard.Content>
      ) : (
        <HeroCard.Content className="p-0">{children}</HeroCard.Content>
      )}
    </HeroCard>
  );
}

export type CardHeaderProps = {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
};

export function CardHeader({ children, className, bordered = false }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "px-4 pt-4 pb-2",
        bordered && "border-b border-[var(--color-line)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type CardBodyProps = {
  children: ReactNode;
  className?: string;
};

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn("px-4 py-4", className)}>{children}</div>;
}

export type CardFooterProps = {
  children: ReactNode;
  className?: string;
};

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-t border-[var(--color-line)] flex items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge — bordered status pill in five tones
// ---------------------------------------------------------------------------

export type StatusBadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusBadgeProps = {
  tone: StatusBadgeTone;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
};

const STATUS_BADGE_STYLES: Record<StatusBadgeTone, CSSProperties> = {
  success: {
    backgroundColor: "#ECFDF5",
    color: "#065F46",
    borderColor: "#A7F3D0",
  },
  warning: {
    backgroundColor: "#FFFBEB",
    color: "#92400E",
    borderColor: "#FCD34D",
  },
  danger: {
    backgroundColor: "#FEF2F2",
    color: "#991B1B",
    borderColor: "#FCA5A5",
  },
  info: {
    backgroundColor: "#EFF6FF",
    color: "#1E40AF",
    borderColor: "#BFDBFE",
  },
  neutral: {
    backgroundColor: "#F5F5F7",
    color: "#3C3C43",
    borderColor: "rgba(0,0,0,0.08)",
  },
};

const STATUS_BADGE_DOT_COLOR: Record<StatusBadgeTone, string> = {
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
  neutral: "#8E8E93",
};

export function StatusBadge({ tone, children, pulse = false, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-full px-2 py-0.5 t-caption font-medium",
        className,
      )}
      style={STATUS_BADGE_STYLES[tone]}
    >
      {pulse && (
        <span
          aria-hidden="true"
          className="inline-block rounded-full animate-pulse"
          style={{
            width: 6,
            height: 6,
            backgroundColor: STATUS_BADGE_DOT_COLOR[tone],
          }}
        />
      )}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MetricCard — KPI card for dashboards
// ---------------------------------------------------------------------------

export type MetricCardDeltaTone = "up" | "down" | "flat";

export type MetricCardProps = {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: MetricCardDeltaTone;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const METRIC_DELTA_COLOR: Record<MetricCardDeltaTone, string> = {
  up: "#065F46",
  down: "#991B1B",
  flat: "#8E8E93",
};

export function MetricCard({
  label,
  value,
  delta,
  deltaTone = "flat",
  icon,
  footer,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-[var(--color-line)] rounded-[var(--radius-card)] p-4 flex flex-col gap-2",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="t-overline text-[#8E8E93]">{label}</span>
        {icon != null && <span className="text-[#8E8E93] shrink-0">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="t-h2 t-num text-[#111]">{value}</span>
        {delta != null && (
          <span
            className="t-caption font-medium"
            style={{ color: METRIC_DELTA_COLOR[deltaTone] }}
          >
            {delta}
          </span>
        )}
      </div>
      {footer != null && <div className="t-caption text-[#8E8E93]">{footer}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar — horizontal toolbar with optional sticky behavior
// ---------------------------------------------------------------------------

export type ToolbarProps = {
  left?: ReactNode;
  right?: ReactNode;
  sticky?: boolean;
  dense?: boolean;
  className?: string;
};

export function Toolbar({ left, right, sticky = false, dense = false, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-[var(--color-line)]",
        dense ? "py-2 px-3" : "py-3 px-4",
        sticky
          ? "sticky top-0 z-30 backdrop-blur-md bg-white/80"
          : "bg-white",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">{left}</div>
      {right != null && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 t-label", className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const content = isLast ? (
          <span className="font-semibold text-[#111]" aria-current="page">
            {item.label}
          </span>
        ) : item.href != null ? (
          <a
            href={item.href}
            className="text-[#8E8E93] hover:text-[#111] transition-colors"
          >
            {item.label}
          </a>
        ) : (
          <span className="text-[#8E8E93]">{item.label}</span>
        );
        return (
          <span key={`${item.label}-${idx}`} className="flex items-center gap-1">
            {content}
            {!isLast && (
              <ChevronRight
                size={12}
                className="text-[#C7C7CC] shrink-0"
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Dialog — controlled modal rendered via portal
// ---------------------------------------------------------------------------

export type DialogSize = "sm" | "md" | "lg";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: DialogSize;
  children: ReactNode;
};

const DIALOG_MAX_WIDTH: Record<DialogSize, number> = {
  sm: 420,
  md: 560,
  lg: 760,
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  children,
}: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full bg-white rounded-[16px] shadow-xl-token flex flex-col overflow-hidden"
        style={{ maxWidth: DIALOG_MAX_WIDTH[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h2 id="dialog-title" className="t-h3 font-semibold text-[#111]">
            {title}
          </h2>
          {description != null && (
            <p className="mt-1 t-label text-[#3C3C43]">{description}</p>
          )}
        </div>
        <div className="px-5 py-3 max-h-[70vh] overflow-auto">{children}</div>
        {footer != null && (
          <div className="px-5 py-3 border-t border-[var(--color-line)] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Tooltip — lightweight hover/focus tooltip (custom div implementation)
// ---------------------------------------------------------------------------

export type TooltipSide = "top" | "bottom" | "left" | "right";

export type TooltipProps = {
  content: ReactNode;
  side?: TooltipSide;
  children: ReactNode;
};

const TOOLTIP_POSITION: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap pointer-events-none",
            "bg-[#111] text-white t-micro px-2 py-1 rounded-md shadow-sm-token",
            TOOLTIP_POSITION[side],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// KbdHint — keyboard shortcut capsules
// ---------------------------------------------------------------------------

export type KbdHintProps = {
  keys: string[];
  className?: string;
};

export function KbdHint({ keys, className }: KbdHintProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((k, idx) => (
        <kbd
          key={`${k}-${idx}`}
          className={cn(
            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5",
            "rounded-md bg-[#F5F5F7] border border-[var(--color-line)]",
            "text-[#3C3C43] t-micro font-medium",
          )}
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControl — Apple-style pill group
// ---------------------------------------------------------------------------

export type SegmentedControlItem = {
  id: string;
  label: string;
};

export type SegmentedControlProps = {
  items: SegmentedControlItem[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
  className?: string;
};

export function SegmentedControl({
  items,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex rounded-lg bg-[#F5F5F7] p-0.5",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-md transition-all duration-150 t-label font-medium",
              size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5",
              selected
                ? "bg-white shadow-xs text-[#111]"
                : "text-[#3C3C43] hover:text-[#111]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner — pure CSS spinner
// ---------------------------------------------------------------------------

export type SpinnerSize = "xs" | "sm" | "md";

export type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
};

const SPINNER_DIMENSIONS: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
};

export function Spinner({ size = "sm", className }: SpinnerProps) {
  const dim = SPINNER_DIMENSIONS[size];
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full border-2 border-[#C7C7CC] border-t-[#4F46E5] animate-spin",
        className,
      )}
      style={{ width: dim, height: dim }}
    />
  );
}

// ---------------------------------------------------------------------------
// DataTable — generic typed table with custom render functions
// ---------------------------------------------------------------------------

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  dense?: boolean;
  emptyState?: ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  dense = false,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState != null) {
    return <div className={cn(className)}>{emptyState}</div>;
  }
  const rowPad = dense ? "py-2" : "py-3";
  const rowHeight = dense ? "h-9" : "h-12";
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-line)]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width != null ? { width: col.width } : undefined}
                className={cn(
                  "t-overline text-[#8E8E93] px-3 py-2",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  (col.align == null || col.align === "left") && "text-left",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick != null ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-[var(--color-line)] transition-colors",
                rowHeight,
                onRowClick != null && "hover:bg-[#FAFAFA] cursor-pointer",
              )}
            >
              {columns.map((col) => {
                const value = (row as unknown as Record<string, unknown>)[col.key];
                const cell = col.render != null ? col.render(row) : (value as ReactNode);
                return (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 t-label text-[#111]",
                      rowPad,
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SidebarNav — vertical sectioned navigation
// ---------------------------------------------------------------------------

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
};

export type SidebarNavSection = {
  title?: string;
  items: SidebarNavItem[];
};

export type SidebarNavProps = {
  sections: SidebarNavSection[];
  activeHref: string;
  className?: string;
};

export function SidebarNav({ sections, activeHref, className }: SidebarNavProps) {
  return (
    <nav className={cn("flex flex-col gap-5", className)}>
      {sections.map((section, sIdx) => (
        <div key={section.title ?? `section-${sIdx}`} className="flex flex-col gap-1">
          {section.title != null && (
            <div className="t-overline text-[#8E8E93] px-2 mb-1">{section.title}</div>
          )}
          {section.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md t-label transition-colors",
                  active
                    ? "bg-white shadow-xs ring-1 ring-black/5 text-[#111]"
                    : "text-[#3C3C43] hover:bg-white/60 hover:text-[#111]",
                )}
              >
                {item.icon != null && (
                  <span className="shrink-0 inline-flex items-center justify-center w-4 h-4">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge != null && <span className="shrink-0">{item.badge}</span>}
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// SearchInput — styled search input with leading icon and optional kbd hint
// ---------------------------------------------------------------------------

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  kbd?: string;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  kbd,
  className,
}: SearchInputProps) {
  return (
    <div
      className={cn(
        "relative flex items-center w-full",
        className,
      )}
    >
      <Search
        size={14}
        className="absolute left-3 text-[#8E8E93] pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-9 pl-8 pr-3 rounded-lg border border-black/[0.08] bg-white t-label",
          "text-[#111] placeholder:text-[#8E8E93] outline-none",
          "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
          kbd != null && "pr-12",
        )}
      />
      {kbd != null && (
        <span className="absolute right-2 pointer-events-none">
          <KbdHint keys={[kbd]} />
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HelpText — small caption helper text, color-coded by tone
// ---------------------------------------------------------------------------

export type HelpTextTone = "muted" | "error" | "success";

export type HelpTextProps = {
  tone?: HelpTextTone;
  children: ReactNode;
  className?: string;
};

const HELP_TEXT_COLOR: Record<HelpTextTone, string> = {
  muted: "#8E8E93",
  error: "#991B1B",
  success: "#065F46",
};

export function HelpText({ tone = "muted", children, className }: HelpTextProps) {
  return (
    <p
      className={cn("t-caption", className)}
      style={{ color: HELP_TEXT_COLOR[tone] }}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// InlineCode — inline monospace code snippet
// ---------------------------------------------------------------------------

export type InlineCodeProps = {
  children: ReactNode;
  className?: string;
};

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        "inline-flex items-center bg-[#F5F5F7] px-1.5 py-0.5 rounded-md t-caption text-[#111]",
        "font-mono",
        className,
      )}
    >
      {children}
    </code>
  );
}
