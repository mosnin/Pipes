"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type InputClassNames = {
  root?: string;
  label?: string;
  field?: string;
  input?: string;
  leftIcon?: string;
  rightIcon?: string;
  successIcon?: string;
  errorMessage?: string;
};

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onNativeChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  /** Truthy error triggers a shake, red border and (if a string) a message. */
  error?: string | boolean;
  /** Reserve one message line so validation does not shift nearby content. */
  reserveErrorLine?: boolean;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  classNames?: InputClassNames;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    value: valueProp,
    defaultValue,
    onChange,
    onNativeChange,
    onFocus,
    onBlur,
    error,
    reserveErrorLine = false,
    success,
    leftIcon,
    rightIcon,
    className,
    classNames,
    disabled,
    id: idProp,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const reduce = useReducedMotion();

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlled ? (valueProp ?? "") : internal;

  const [focused, setFocused] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);

  const hasError = Boolean(error);
  const errorMessage = typeof error === "string" ? error : null;

  // Right edge shows the success check, otherwise the caller's right icon.
  const rightSlot = success ? null : rightIcon;

  // Shake the field when an error appears.
  useEffect(() => {
    if (!fieldRef.current || reduce || !hasError) return;
    animate(
      fieldRef.current,
      { x: [0, -6, 6, -4, 4, -2, 0] },
      { duration: 0.45 },
    );
  }, [hasError, reduce]);

  const handleChange = (next: string) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className={cn("flex flex-col gap-[6px]", className, classNames?.root)}>
      {label ? (
        <label
          htmlFor={id}
          className={cn(
            "px-[4px] text-sm t-body-strong text-foreground",
            classNames?.label,
          )}
        >
          {label}
        </label>
      ) : null}

      <div
        ref={fieldRef}
        data-state={
          hasError
            ? "error"
            : success
              ? "success"
              : focused
                ? "focused"
                : "idle"
        }
        className={cn(
          // Measured on the reference's VAT field: 32 tall, an 8px radius.
          // This used to be a 44px capsule, and because `rounded-full` and
          // the caller's `rounded-10` are not the same utility group,
          // tailwind-merge kept both and source order decided — so every
          // field in the product was a capsule no matter what the caller
          // asked for. The geometry belongs here, where it can be measured.
          "relative h-[var(--control-h-field)] overflow-hidden rounded-8 border transition-colors duration-200",
          "border-border",
          focused && !hasError && "border-foreground/40 ring-2 ring-ring/40",
          hasError && "border-destructive ring-2 ring-destructive/25",
          disabled && "opacity-60",
          classNames?.field,
        )}
      >
        {leftIcon ? (
          <span
            className={cn(
              "pointer-events-none absolute left-[12px] top-1/2 flex -translate-y-1/2 items-center text-muted-foreground [&_svg]:h-[16px] [&_svg]:w-[16px]",
              classNames?.leftIcon,
            )}
          >
            {leftIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          {...rest}
          onChange={(e) => {
            handleChange(e.target.value);
            onNativeChange?.(e);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "peer h-full w-full bg-transparent text-base leading-6 text-foreground caret-foreground outline-none",
            "placeholder:text-muted-foreground/60",
            leftIcon ? "pl-[40px]" : "pl-[14px]",
            rightSlot || success ? "pr-[40px]" : "pr-[14px]",
            disabled && "cursor-not-allowed",
            classNames?.input,
          )}
        />

        {success ? (
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            className={cn(
              "absolute right-[14px] top-1/2 h-[20px] w-[20px] -translate-y-1/2 text-(--color-success)",
              classNames?.successIcon,
            )}
          >
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </motion.svg>
        ) : rightSlot ? (
          <span
            className={cn(
              "absolute right-0 top-0 flex h-full items-center text-muted-foreground [&_button]:grid [&_button]:size-[44px] [&_button]:place-items-center [&_svg]:h-[16px] [&_svg]:w-[16px]",
              classNames?.rightIcon,
            )}
          >
            {rightSlot}
          </span>
        ) : null}
      </div>

      <div className={reserveErrorLine ? "min-h-[16px]" : "contents"}>
        <AnimatePresence initial={false}>
          {errorMessage ? (
            <motion.p
              id={`${id}-error`}
              role="alert"
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, filter: "blur(4px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, filter: "blur(4px)" }
              }
              transition={{ duration: 0.2 }}
              className={cn(
                "px-[4px] text-xs text-destructive",
                classNames?.errorMessage,
              )}
            >
              {errorMessage}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
});
