"use client";

import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Podium's Button and IconButton (docs/DESIGN.md, Components).
 *
 * Pills, always. `primary` is the black pill (white in dark mode),
 * `secondary` the white pill with a hairline, `ghost` quiet text that fills on
 * hover. `destructive` is a red label until a confirmation dialog opts into
 * the solid red fill with `data-solid`. Every button presses to
 * `scale(0.97)` (the `press` class) and shows the accent focus ring on
 * keyboard focus. Sizes: xs 28px, sm 32px, md 36px, lg 44px (dialogs).
 */

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export const buttonVariants = cva(
  [
    "press group relative inline-flex shrink-0 touch-manipulation select-none items-center justify-center",
    "whitespace-nowrap rounded-full font-medium [-webkit-tap-highlight-color:transparent]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&>[data-spinner]+svg]:hidden",
  ],
  {
    variants: {
      size: {
        xs: "h-7 gap-1 px-2.5 text-[12px] [&_svg:not([data-spinner])]:size-[14px]",
        sm: "h-8 gap-1.5 px-3 text-[13px] [&_svg:not([data-spinner])]:size-4",
        md: "h-9 gap-1.5 px-4 text-sm [&_svg:not([data-spinner])]:size-4",
        lg: "h-11 gap-2 px-6 text-[15px] [&_svg:not([data-spinner])]:size-4",
      },
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-action-hover aria-disabled:hover:bg-primary",
        secondary: [
          "border border-border bg-card text-foreground hover:bg-muted/60",
          "dark:border-transparent dark:bg-muted dark:hover:bg-border-strong",
          "aria-pressed:bg-muted",
        ],
        ghost: [
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "aria-disabled:hover:bg-transparent aria-pressed:bg-muted aria-pressed:text-foreground",
        ],
        destructive: [
          "text-destructive hover:bg-destructive/10",
          "aria-disabled:hover:bg-transparent",
          // A confirmation dialog's confirm opts into the solid fill.
          "data-[solid]:bg-destructive data-[solid]:text-white data-[solid]:hover:bg-destructive data-[solid]:hover:brightness-110",
          "[&.is-solid]:bg-destructive [&.is-solid]:text-white [&.is-solid]:hover:brightness-110",
        ],
        link: "t-link bg-transparent hover:bg-transparent",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        // A link is text, not a control: it sits on the baseline of its sentence.
        class: "h-auto gap-1 rounded-sm p-0 align-baseline font-normal [&]:active:scale-100",
      },
    ],
    defaultVariants: { variant: "secondary", size: "sm" },
  },
);

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  asChild = false,
  loading = false,
  style,
  children,
  ...props
}: ButtonProps): ReactNode {
  const ref = useRef<HTMLButtonElement | null>(null);

  // §7.3 / §11.4.6: an in-flight button keeps its geometry. The resting width is
  // measured after every settled render and parked on the element itself as a
  // custom property, so the value the loading render needs is already ON the
  // node before the spinner appears. The lock is therefore correct on the first
  // loading frame with no ref read during render, no layout effect, and
  // therefore no SSR warning. React never owns `--btn-resting-w`, so it survives
  // every re-render of the button.
  useEffect(() => {
    const node = ref.current;
    if (!loading && node) {
      node.style.setProperty("--btn-resting-w", `${node.offsetWidth}px`);
    }
  });

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      className={cn(
        buttonVariants({ variant, size }),
        loading && "pointer-events-none",
        className,
      )}
      style={
        // Unset until the first settled render — `auto` is min-width's initial
        // value, so a button that mounts already loading locks to nothing,
        // exactly as before.
        loading ? { minWidth: "var(--btn-resting-w, auto)", ...style } : style
      }
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {/* Slottable lets `asChild` still receive the spinner as an extra child. */}
      <Slottable>{children}</Slottable>
    </Comp>
  );
}

/**
 * 14px, 2px stroke, a 270° arc, 700ms linear (§7.3). The timing is set inline
 * because an inline declaration reliably outranks the `animation` shorthand that
 * `animate-spin` emits whichever order the utility layer lands in; the reduced
 * motion block in globals.css still wins over it, since that uses `!important`.
 */
function Spinner(): ReactNode {
  return (
    <svg
      data-spinner=""
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className="size-[14px] shrink-0 animate-spin"
      style={{ animationDuration: "700ms", animationTimingFunction: "linear" }}
    >
      <path
        d="M13 7A6 6 0 1 0 7 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type IconButtonProps = ComponentProps<"button"> & {
  /** Becomes the `aria-label`. An icon-only control without one does not ship (§8.2). */
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "secondary" | "bar";
  asChild?: boolean;
};

const iconButtonSizes: Record<NonNullable<IconButtonProps["size"]>, string> = {
  // Podium: 28px in dense rows and the sidebar, 32px in bars, 36px beside a button.
  sm: "size-7 rounded-lg",
  md: "size-8 rounded-full",
  lg: "size-9 rounded-full",
};

export function IconButton({
  className,
  label,
  size = "md",
  variant = "ghost",
  asChild = false,
  ...props
}: IconButtonProps): ReactNode {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      aria-label={label}
      className={cn(
        "press relative inline-flex shrink-0 items-center justify-center",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:size-[16px] [&_svg]:shrink-0",
        // Hit-area feedback is a fill, not a glyph-colour shift (§9.2, §13.6.60).
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "aria-pressed:bg-muted aria-pressed:text-foreground",
        "aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground",
        // §6.5: where the visual box is below the required target, expand it with
        // an invisible pseudo-element — never by growing the box.
        "before:absolute before:-inset-2 before:content-['']",
        "pointer-coarse:before:-inset-4",
        iconButtonSizes[size],
        variant === "secondary" &&
          "border border-border bg-card text-foreground hover:bg-muted/60 dark:border-transparent dark:bg-muted",
        // On the bar, and only there: the inverted palette, so the control
        // is not a light chip punched into a near-black strip.
        variant === "bar" &&
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
