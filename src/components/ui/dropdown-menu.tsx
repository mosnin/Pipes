"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "@/components/ui/icon";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * LEDGER INSTRUMENT — Dropdown menu (§9.31).
 *
 * A transient layer: `--surface-overlay`, `--r-8`, `--elev-2` (§5.6.2). In dark
 * mode the overlay steps one rung lighter than a card, so a menu opened over a
 * card is unambiguously above it without relying on a drop shadow that
 * a near-black canvas cannot show.
 *
 * Rows are `--r-6` and take a `--state-hover` fill. The only hue permitted
 * anywhere in this component is `--critical-text` on a destructive item
 * (§4.6.12) — highlight, check marks and chevrons are all monochrome.
 */

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/**
 * §7.3: opacity + `translateY(-4px)` + `scale(0.98)` over `--dur-3 --ease-out`,
 * with the transform origin at the trigger edge — the panel grows out of the
 * control that opened it, so the slide direction follows Radix's resolved side.
 * The exit is opacity and scale only, at 120ms (0.6 × 200ms, §7.1): things
 * arrive deliberately and leave immediately.
 */
const overlayMotion = [
  "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
  "duration-[var(--dur-3)] ease-[var(--ease-out)]",
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98",
  "data-[state=open]:data-[side=bottom]:slide-in-from-top-[4px]",
  "data-[state=open]:data-[side=top]:slide-in-from-bottom-[4px]",
  "data-[state=open]:data-[side=left]:slide-in-from-right-[4px]",
  "data-[state=open]:data-[side=right]:slide-in-from-left-[4px]",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98",
  "data-[state=closed]:duration-[120ms] data-[state=closed]:ease-[var(--ease-out)]",
];

const overlaySurface = [
  // z 100 on the §5.9 ladder: above sticky chrome and the sidebar, below the
  // dialog scrim.
  "z-[100] min-w-[200px] max-w-[320px] max-h-[60vh] overflow-y-auto overflow-x-hidden",
  "rounded-[14px] bg-card p-1.5 shadow-float",
];

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>): ReactNode {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(overlaySurface, overlayMotion, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

/**
 * The shared row geometry: 34px, `--r-6`, an 8px icon gap, 16px glyphs at
 * `--text-tertiary`. `t-body` carries the label; nothing here sets a size.
 */
const rowBase = [
  "relative flex h-8 cursor-default select-none items-center gap-2.5 rounded-lg px-2",
  "text-[13px] text-foreground outline-none",
  "transition-colors duration-[var(--dur-1)] ease-linear",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
  // Radix marks the active descendant with `data-highlighted` for both pointer
  // and keyboard, so hover and roving focus land on the same treatment.
  "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
  "data-[highlighted]:[&_svg]:text-ink-2",
  "data-[disabled]:pointer-events-none data-[disabled]:text-ink-4",
  "data-[disabled]:[&_svg]:text-ink-4",
];

const rowDestructive = [
  "text-critical-text [&_svg]:text-critical-text",
  "data-[highlighted]:bg-critical-wash data-[highlighted]:text-critical-text",
  "data-[highlighted]:[&_svg]:text-critical-text",
];

export type DropdownMenuItemProps = ComponentProps<
  typeof DropdownMenuPrimitive.Item
> & {
  /** Revoke, abandon, delete: label and glyph take `--critical-text` (§4.6.12). */
  destructive?: boolean;
  /** Why this item is unavailable — right-aligned `micro`, per §9.31. */
  reason?: ReactNode;
};

export function DropdownMenuItem({
  className,
  destructive = false,
  reason,
  children,
  ...props
}: DropdownMenuItemProps): ReactNode {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(rowBase, destructive && rowDestructive, className)}
      {...props}
    >
      {children}
      {reason ? (
        <span className="ml-auto pl-3 t-micro text-ink-4">{reason}</span>
      ) : null}
    </DropdownMenuPrimitive.Item>
  );
}

/**
 * A checkable row reserves a 20px leading slot so labels align down the menu
 * whether or not anything is checked (§9.31). The check is monochrome: a menu
 * is chrome, and chrome carries no hue.
 */
export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>): ReactNode {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(rowBase, "pl-8", className)}
      {...props}
    >
      <span className="absolute left-3 inline-flex size-[20px] items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="text-ink!" strokeWidth={1.5} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  indicator,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  /** Replaces the radio dot: a Select draws a check on the chosen row. */
  indicator?: ReactNode;
}): ReactNode {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(rowBase, "pl-8", className)}
      {...props}
    >
      <span className="absolute left-3 inline-flex size-[20px] items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          {indicator ?? (
            <Circle
              aria-hidden="true"
              className="size-[8px]! text-ink!"
              fill="currentColor"
              strokeWidth={0}
            />
          )}
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>): ReactNode {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(rowBase, "data-[state=open]:bg-state-hover", className)}
      {...props}
    >
      {children}
      <ChevronRight
        aria-hidden="true"
        className="ml-auto size-[14px]!"
        strokeWidth={1.25}
      />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>): ReactNode {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        className={cn(overlaySurface, overlayMotion, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>): ReactNode {
  return (
    <DropdownMenuPrimitive.Separator
      // Bled through the menu's 4px padding so the rule reads as a division of
      // the whole panel rather than a short dash floating between two rows.
      className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>): ReactNode {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-2 pt-1.5 pb-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

/** A `⌘K`-style hint or a trailing meta string, right-aligned inside a row. */
export function DropdownMenuShortcut({
  className,
  ...props
}: ComponentProps<"span">): ReactNode {
  return (
    <span
      className={cn("ml-auto pl-3 t-micro tabular text-ink-4", className)}
      {...props}
    />
  );
}

/**
 * §9.31's zero-data rendering: a 32px non-interactive row. A menu that opens
 * onto nothing must still look like a menu — an empty popover that collapses to
 * a 8px sliver reads as a bug, not as "no results".
 */
export function DropdownMenuEmpty({
  className,
  children = "Nothing here",
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      className={cn(
        "flex h-[32px] select-none items-center px-3 t-caption text-ink-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
