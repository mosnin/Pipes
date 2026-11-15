"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { CircleAlert, Search, X } from "@/components/ui/icon";
import {
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Input as MotionInput } from "@/components/motion/input";
import { cn } from "@/lib/utils";

/**
 * LEDGER INSTRUMENT — Input, Textarea, Field and SearchInput (§9.27).
 *
 * A text control is a CAVITY: `--surface-inset` cut into the card it sits on,
 * bounded by `--line-border`. That is the adjacency-legal move (raised → inset,
 * §2.1) and it is why a form reads as a set of wells rather than a stack of
 * outlines. Validation is the one place hue is allowed near a control (§4.6.10),
 * and it is ALWAYS doubled: a border, a glyph and a message — the value's own
 * text never turns red.
 */

export const controlBase = [
  // The reference's input: a bordered field on the card ground, 32px tall.
  "w-full bg-raised text-ink t-body",
  "border border-border",
  "transition-[background-color,border-color,color,box-shadow]",
  "duration-[var(--dur-1)] ease-[var(--ease-out)]",
  "placeholder:text-ink-4",
  "hover:border-strong",
  // The two-stop ring's first stop is the surface the control sits ON — a card —
  // so the offset gap actually reads against the cavity (§5.8).
  "focus-ring focus-visible:border-ink focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:text-ink-4 disabled:placeholder:text-ink-4",
  // Read-only drops the edge entirely: the well remains, the affordance does not.
  // Guarded with `enabled:` because `:read-only` also matches a disabled input,
  // and a disabled control keeps its border — it is unavailable, not immutable.
  "read-only:enabled:cursor-text read-only:enabled:border-transparent",
  "read-only:enabled:hover:border-transparent",
].join(" ");

export type InputProps = ComponentProps<"input"> & { invalid?: boolean };

export function Input({
  className,
  invalid = false,
  value,
  defaultValue,
  onChange,
  ref,
  ...props
}: InputProps): ReactNode {
  return (
    <MotionInput
      {...props}
      ref={ref}
      value={value === undefined ? undefined : String(value)}
      defaultValue={
        defaultValue === undefined ? undefined : String(defaultValue)
      }
      onNativeChange={onChange}
      error={invalid}
      classNames={{
        root: "min-w-0 w-full",
        field: "bg-raised border-border",
        input: cn("t-body text-ink placeholder:text-ink-4", className),
      }}
    />
  );
}

export type TextareaProps = ComponentProps<"textarea"> & { invalid?: boolean };

export function Textarea({
  className,
  invalid = false,
  ...props
}: TextareaProps): ReactNode {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        // Vertical only: horizontal resize breaks the column grid it sits in.
        "min-h-[96px] resize-y rounded-8 px-4 py-3",
        invalid &&
          "border-critical-border pr-9 hover:border-critical-border focus-visible:border-critical-border",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/**
 * The only sanctioned way to render a labelled control (§9.27).
 *
 * `label-caps` label · 6px · control · 6px · helper or error (§6.2). The helper
 * row is not reserved when there is nothing to say — a permanently empty 18px
 * band under every field reads as a rendering fault, and a field with neither
 * hint nor error is complete without it.
 *
 * The error is carried three ways at once so it survives greyscale (§12.2): the
 * control's own critical border, a 14px critical glyph in the gutter the control
 * reserves when `invalid`, and the message itself. Wire the control with
 * `aria-describedby={`${htmlFor}-message`}` and `invalid` to complete the pair.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: FieldProps): ReactNode {
  const message = error ?? hint;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <LabelPrimitive.Root
        htmlFor={htmlFor}
        className="t-caption-medium text-ink"
      >
        {label}
      </LabelPrimitive.Root>

      <div className="relative">
        {children}
        {error ? (
          // Top-aligned rather than centred so it lands correctly on a textarea
          // as well as on a 32px input: 9px = (32 − 14) / 2.
          <CircleAlert
            aria-hidden="true"
            size={14}
            strokeWidth={1.25}
            className="pointer-events-none absolute right-5 top-[9px] text-critical"
          />
        ) : null}
      </div>

      {message ? (
        <p
          id={htmlFor ? `${htmlFor}-message` : undefined}
          aria-live={error ? "polite" : undefined}
          className={cn(
            "t-caption",
            error ? "text-critical-text" : "text-ink-3",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export type SearchInputProps = ComponentProps<"input"> & {
  onClear?: () => void;
};

/**
 * The reference's search field: a bordered 32px field with a leading 14px
 * magnifier, the same shape as every other input.
 *
 * Empty rendering: the glyph and the placeholder, with no clear affordance —
 * a clear button on an empty field is a control that cannot do anything.
 */
export function SearchInput({
  className,
  onClear,
  onChange,
  ...props
}: SearchInputProps): ReactNode {
  // Tracked so the clear affordance is correct for uncontrolled fields too; a
  // controlled `value` always wins over the tracked copy.
  const [typed, setTyped] = useState(
    () => String(props.defaultValue ?? "").length > 0,
  );
  const hasValue =
    props.value !== undefined ? String(props.value).length > 0 : typed;
  const clearable = Boolean(onClear) && hasValue;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    setTyped(event.target.value.length > 0);
    onChange?.(event);
  }

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <Search
        aria-hidden="true"
        size={14}
        strokeWidth={1.25}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
      />
      <input
        type="search"
        onChange={handleChange}
        className={cn(
          controlBase,
          "h-[36px] rounded-10 pl-10",
          // Native search decorations would collide with the clear button.
          "[&::-webkit-search-cancel-button]:appearance-none",
          clearable ? "pr-10" : "pr-5",
        )}
        {...props}
      />
      {clearable ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2",
            "inline-flex size-[24px] items-center justify-center rounded-6",
            "text-ink-3 transition-[background-color,color,box-shadow]",
            "duration-[var(--dur-1)] ease-[var(--ease-out)]",
            "hover:bg-state-hover hover:text-ink active:bg-state-active",
            "focus-ring focus-visible:outline-none",
            // 24px is under the 28px dense floor, so the target is expanded
            // invisibly rather than by growing the glyph (§6.5).
            "before:absolute before:-inset-4 before:content-[''] pointer-coarse:before:-inset-6",
          )}
        >
          <X aria-hidden="true" size={14} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}
