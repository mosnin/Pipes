"use client";

import { Check, ChevronDown } from "@/components/ui/icon";
import { useId, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ==========================================================================
   SELECT (§9.10)

   One value from a short closed list. The trigger is the product's input
   box with a 14px chevron; the list is the product's menu (overlay surface,
   elev-2, 36px rows, a check on the chosen row), so a select looks like the
   field beside it when closed and like every other menu when open. Native
   `<select>` is never used in the product: it renders OS chrome that
   ignores the theme, the radius and the type scale.

   Built on the DropdownMenu primitive rather than a second Radix package, so
   keyboard behaviour (arrows, Home/End, type-ahead, Escape) is the same as
   every menu in the app and there is one implementation to keep right.
   ========================================================================== */

export type SelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  /** Shown when `value` matches no option (typically `""`). */
  placeholder?: ReactNode;
  id?: string;
  disabled?: boolean;
  /** `md` is the 36px field control; `sm` is the 32px inline control. */
  size?: "sm" | "md";
  /**
   * `box` is the input box. `quiet` is borderless until hover or focus, for
   * a select that sits inside a table cell and should read as the cell.
   */
  variant?: "box" | "quiet";
  className?: string;
  /** Width of the open list; defaults to the trigger's width. */
  menuClassName?: string;
  align?: "start" | "end";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Choose…",
  id,
  disabled = false,
  size = "md",
  variant = "box",
  className,
  menuClassName,
  align = "start",
  ...aria
}: SelectProps): ReactNode {
  const generated = useId();
  const triggerId = id ?? generated;
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={triggerId}
          data-slot="select-trigger"
          aria-label={aria["aria-label"]}
          aria-labelledby={aria["aria-labelledby"]}
          aria-describedby={aria["aria-describedby"]}
          data-invalid={aria["aria-invalid"] || undefined}
          className={cn(
            variant === "box"
              ? cn(
                  // The input box, minus the read-only rule: a button matches
                  // `:read-only`, and an input's read-only state is not a
                  // select's resting state.
                  "w-full border border-border bg-raised text-ink outline-none",
                  "transition-[background-color,border-color,color,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out)]",
                  "hover:border-strong focus-ring focus-visible:border-ink",
                  "disabled:cursor-not-allowed disabled:text-ink-4",
                )
              : cn(
                  "focus-ring flex w-full items-center rounded-6 border border-transparent bg-transparent text-ink outline-none",
                  "transition-colors duration-[var(--dur-1)] ease-linear hover:border-border focus-visible:bg-inset",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ),
            "flex items-center justify-between gap-1.5 text-left",
            size === "md"
              ? "h-[36px] rounded-10 pl-3 pr-2 t-body"
              : "h-[32px] rounded-8 pl-2 pr-1.5 t-caption",
            variant === "quiet" && "rounded-6",
            aria["aria-invalid"] &&
              "border-critical-border hover:border-critical-border focus-visible:border-critical-border",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              selected ? "text-ink" : "text-ink-3",
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={14}
            strokeWidth={1.5}
            className="shrink-0 text-ink-3"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        id={`${triggerId}-list`}
        align={align}
        className={cn(
          "max-h-[320px] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto",
          menuClassName,
        )}
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              indicator={<Check aria-hidden="true" size={14} strokeWidth={2} />}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
