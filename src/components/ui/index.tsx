"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
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
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm",
        "text-slate-800 shadow-sm outline-none",
        "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
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
    <HeroCard className={cn("bg-white shadow-sm", className)}>
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
    <HeroCard className={cn("bg-white shadow-sm", className)}>
      <HeroCard.Header className="px-4 pt-4 pb-0">
        <HeroCard.Title className="text-base font-semibold text-slate-800">
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
        "w-64 bg-white border-r border-slate-200 p-4 min-h-screen flex flex-col",
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
        "flex justify-between items-center border-b border-slate-200 bg-white px-4 py-3",
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
        "border border-dashed border-slate-300 rounded-xl p-10 text-center",
        "flex flex-col items-center gap-3",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
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
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle != null && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
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
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {description != null && (
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
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
      <strong className="block text-sm font-semibold text-slate-800">{author}</strong>
      <p className="mt-0.5 text-sm text-slate-600">{text}</p>
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
