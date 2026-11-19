"use client";

import { Slot } from "@radix-ui/react-slot";
import { PanelLeft } from "@/components/ui/icon";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { IconButton, type IconButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The collapsible sidebar, ported from the reference dashboard's
 * `components/ui/sidebar.tsx` onto this repo's primitives: the mobile sheet is
 * the Radix `Dialog` every other overlay here already uses, the collapsed-rail
 * tooltips are the repo's `Tooltip`, and the trigger is an `IconButton`.
 *
 * Geometry is the reference's: 16rem open, a 3rem icon rail collapsed, an
 * 18rem sheet on mobile, and ctrl/cmd+b to toggle. The open state is written
 * to a cookie so a reload lands on the rail the user left.
 */

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
/**
 * 240px, measured at 304/1.2698 on five references.
 *
 * The rail's gutters are DELIBERATELY asymmetric: 12 on the left, 20 on the
 * right. That is the reference's own inset — its selected pill runs
 * 10 to 218 inside a 240 rail — and the first pass recorded the asymmetry,
 * decided it looked like a reserved scrollbar gutter, and squared it up at
 * 12 both sides. It is not a scrollbar gutter. It is what stops a nav row's
 * trailing count or chevron from sitting 28px from the page's first card;
 * with it, the last thing in the rail and the first thing in the pane have
 * 36px between them instead of 28, and the two stop reading as one column.
 */
const SIDEBAR_WIDTH = "var(--nav-w)";
const SIDEBAR_WIDTH_MOBILE = "20rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
/** Tailwind's `lg`: the breakpoint every page in the app already lays out at. */
const MOBILE_BREAKPOINT = 1024;

interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (): void => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export interface SidebarProviderProps extends ComponentProps<"div"> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps): ReactNode {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = useCallback(
    (value: boolean | ((current: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value;
      if (setOpenProp) setOpenProp(next);
      else setInternalOpen(next);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
    },
    [setOpenProp, open],
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) setOpenMobile((current) => !current);
    else setOpen((current) => !current);
  }, [isMobile, setOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  const value = useMemo<SidebarContextValue>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as CSSProperties
        }
        // `h-dvh` rather than `min-h-dvh`: the bar is a fixed 56px band and
        // the body beneath it scrolls in two independent columns, so the
        // wrapper has to be exactly the viewport. With a minimum, the rail's
        // own column grew past the bottom of the screen and its footer rows
        // went off the end with nothing to scroll them back.
        className={cn(
          "group/sidebar-wrapper flex h-dvh w-full overflow-hidden",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export interface SidebarProps extends ComponentProps<"div"> {
  collapsible?: "icon" | "none";
  /** The mobile sheet's accessible name. */
  label?: string;
}

/**
 * On desktop the rail is an ordinary flex child of the body sheet, scrolling
 * inside its own column. It used to be `fixed inset-y-0` with a same-width
 * gap element holding the content beside it; that cannot work now that the
 * bar owns the top 56px, because a fixed column anchored to the viewport
 * runs underneath it and out through the sheet's rounded corner.
 *
 * The rail is a PEER surface: a right border and no shadow in either theme,
 * because a shadowed sidebar reads as a drawer and this one is permanent.
 */
export function Sidebar({
  collapsible = "icon",
  label = "Navigation",
  className,
  children,
  ...props
}: SidebarProps): ReactNode {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "flex h-full w-[var(--sidebar-width)] flex-col bg-rail text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Dialog open={openMobile} onOpenChange={setOpenMobile}>
        <DialogContent
          data-slot="sidebar"
          data-mobile="true"
          showClose={false}
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as CSSProperties}
          className={cn(
            "left-0 top-0 h-dvh w-[var(--sidebar-width)] max-w-none translate-x-0 translate-y-0",
            "flex-col gap-0 rounded-0 border-y-0 border-l-0 bg-rail p-0 text-ink",
            "[--dialog-gutter:0px]",
            "data-[state=open]:slide-in-from-left-[16px] data-[state=open]:slide-in-from-bottom-0",
          )}
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <DialogDescription className="sr-only">
            Displays the mobile sidebar.
          </DialogDescription>
          <div className="flex h-full w-full flex-col">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <aside
      aria-label={label}
      className="group peer hidden shrink-0 text-ink lg:flex"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-container"
        className={cn(
          "flex w-[var(--sidebar-width)] min-h-0 flex-col overflow-hidden bg-rail",
          "transition-[width] duration-[var(--dur-3)] ease-linear",
          "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
          className,
        )}
        {...props}
      >
        <div
          data-slot="sidebar-inner"
          className="flex size-full min-h-0 flex-col bg-rail"
        >
          {children}
        </div>
      </div>
    </aside>
  );
}

export type SidebarTriggerProps = Omit<IconButtonProps, "label"> & {
  label?: string;
};

export function SidebarTrigger({
  className,
  onClick,
  label = "Toggle sidebar",
  size = "sm",
  ...props
}: SidebarTriggerProps): ReactNode {
  const { toggleSidebar } = useSidebar();
  return (
    <IconButton
      data-slot="sidebar-trigger"
      label={label}
      size={size}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft strokeWidth={1.5} />
    </IconButton>
  );
}

export function SidebarHeader({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex shrink-0 flex-col gap-1.5 p-2", className)}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex shrink-0 flex-col gap-1.5 p-2", className)}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
        "group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("relative flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  );
}

/**
 * The 11px group label. It collapses to nothing on the icon rail, animated
 * through its margin so the groups close up instead of leaving a hole.
 */
export function SidebarGroupLabel({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "t-group-label flex h-[28px] shrink-0 items-center ps-3 pe-5 text-ink-3",
        "transition-[margin,opacity] duration-[var(--dur-3)] ease-linear",
        "group-data-[collapsible=icon]:-mt-[28px] group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="sidebar-group-content"
      className={cn("w-full", className)}
      {...props}
    />
  );
}

export function SidebarMenu({
  className,
  ...props
}: ComponentProps<"ul">): ReactNode {
  return (
    <ul
      data-slot="sidebar-menu"
      // No gap: measured, the nav row's pitch and its height are both 28,
      // so the rows meet. A 2px gap here put every rail in the product 7%
      // taller than the reference's and read as a list rather than a rail.
      className={cn("flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  );
}

export function SidebarMenuItem({
  className,
  ...props
}: ComponentProps<"li">): ReactNode {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

export interface SidebarMenuButtonProps extends ComponentProps<"button"> {
  asChild?: boolean;
  isActive?: boolean;
  /** Shown on the icon rail only; the expanded row already carries its label. */
  tooltip?: ReactNode;
  size?: "default" | "sm";
}

/**
 * The reference's menu row: 32px, 14px type, 14px icons, an 8px gap, the
 * accent fill when active and a hover fill otherwise. On the icon rail it
 * squares to 32px and the label is clipped away.
 */
export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  size = "default",
  className,
  ...props
}: SidebarMenuButtonProps): ReactNode {
  const { isMobile, state } = useSidebar();
  const Comp = asChild ? Slot : "button";

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-size={size}
      data-active={isActive || undefined}
      className={cn(
        // Measured on the reference: a 28px row, 8px in from the pill's
        // edge, an 8px gap to an 18px icon, a 13px label. The row IS the
        // pill — pitch and pill height are both 28, so the selected row
        // fills its slot with no vertical gap above or below it.
        "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-8 px-2 text-left",
        // The reference's rail is not quiet: its top-level rows are dark and
        // medium-weight, and only the sub-items under an expanded section
        // drop to grey and regular. Ours had every row at body weight in
        // --text-secondary, which read as a list of links rather than as
        // navigation.
        size === "sm"
          ? "min-h-[24px] t-caption text-ink-3"
          : isActive
            ? "min-h-[var(--nav-row-h)] t-body-strong text-ink"
            : "min-h-[var(--nav-row-h)] t-body-medium text-ink",
        "outline-none",
        "transition-[background-color,color,width,padding] duration-[var(--dur-1)] ease-linear",
        "hover:bg-state-hover hover:text-ink",
        "focus-ring-rail",
        "active:bg-state-active",
        // The current page is the one RAISED thing in the chassis: a fill a
        // step above the rail with a hairline under it, not a tint of it.
        "data-[active]:bg-rail-selected data-[active]:text-ink",
        "data-[active]:shadow-[0_0_0_1px_var(--line-border),0_1px_1px_0_rgba(0,0,0,0.04)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        "group-data-[collapsible=icon]:size-[32px]! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!",
        // 18, not 16. Measured like-for-like against the reference's "Home"
        // row at the same scale, its glyph's ink is 12 x 13 where a 16px
        // Phosphor icon draws 10 x 10: the box is nominally the same and
        // the drawing inside it is not.
        "[&>svg]:size-[18px] [&>svg]:shrink-0",
        "[&>span:last-child]:truncate",
        className,
      )}
      {...props}
    />
  );

  if (
    tooltip === undefined ||
    tooltip === null ||
    state !== "collapsed" ||
    isMobile
  ) {
    return button;
  }
  return (
    <Tooltip content={tooltip} side="right">
      {button}
    </Tooltip>
  );
}

export function SidebarMenuSub({
  className,
  ...props
}: ComponentProps<"ul">): ReactNode {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      className={cn(
        // No tree rail and no extra indent. The reference opens Drafts,
        // Shipping labels and Abandoned checkouts under Orders and gives them
        // neither: a sub-item's label starts at x=63 @1920 and a parent row's
        // label starts at x=58, so they share one left edge and the missing
        // icon is what reads as depth. A hairline and a 24px indent were ours.
        "flex min-w-0 flex-col",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenuSubItem({
  className,
  ...props
}: ComponentProps<"li">): ReactNode {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  );
}

export interface SidebarMenuSubButtonProps extends ComponentProps<"a"> {
  asChild?: boolean;
  isActive?: boolean;
}

export function SidebarMenuSubButton({
  asChild = false,
  isActive = false,
  className,
  ...props
}: SidebarMenuSubButtonProps): ReactNode {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-active={isActive || undefined}
      className={cn(
        // 24 to the parent row's 28, and the label lands on the parent's
        // label rather than past it: 16 of row inset + an 18px icon + a 16px
        // gap is 50.
        "flex h-[24px] min-w-0 items-center gap-2 overflow-hidden rounded-8 pe-2 ps-[50px]",
        isActive ? "t-body-strong" : "t-body",
        "text-ink-2 outline-none",
        "transition-colors duration-[var(--dur-1)] ease-linear",
        "hover:bg-state-hover hover:text-ink focus-ring-rail active:bg-state-active",
        "data-[active]:bg-selected data-[active]:text-ink",
        "group-data-[collapsible=icon]:hidden",
        "[&>span:last-child]:truncate [&>svg]:size-[14px] [&>svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Loading rows at the landed geometry, so the swap causes no layout shift.
 * Widths are drawn deterministically from the index so the ragged edge does
 * not flicker into a new shape every render.
 */
const SKELETON_WIDTHS = ["w-[60%]", "w-[45%]", "w-[72%]", "w-[52%]", "w-[40%]"];

export function SidebarMenuSkeleton({
  className,
  index = 0,
  ...props
}: ComponentProps<"div"> & { index?: number }): ReactNode {
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      className={cn(
        "flex h-[40px] items-center gap-3 rounded-10 px-3",
        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
        className,
      )}
      {...props}
    >
      <Skeleton className="size-[18px] shrink-0 rounded-4" />
      <Skeleton
        className={cn(
          "h-[12px] flex-1 group-data-[collapsible=icon]:hidden",
          SKELETON_WIDTHS[index % SKELETON_WIDTHS.length],
        )}
      />
    </div>
  );
}

/**
 * The expand / collapse wrapper for a nested list: a `grid-template-rows`
 * transition from `0fr` to `1fr`, which animates to the content's own height
 * without measuring it.
 */
export function SidebarCollapse({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div
      data-slot="sidebar-collapse"
      data-state={open ? "open" : "closed"}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-[var(--dur-4)] ease-[var(--ease-move)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
