"use client";

/**
 * Hold to confirm, for destructive actions that are rare and hard to undo.
 * Adapted from microinteractions.dev (Copyright (c) 2026 Juan Di Nella, MIT).
 *
 * Press and hold: a fill sweeps across the pill (linear, `duration`), and
 * letting go early snaps it back (180ms ease-out). Space or Enter held down
 * works the same. A click that didn't come from a hold (a screen reader, a
 * switch) gets a plain confirm dialog instead, so nobody is locked out.
 */
import { Check } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn as cx } from "@/lib/utils";

export function HoldConfirm({
  label,
  holdingLabel = "Keep holding…",
  confirmedLabel = "Done",
  question,
  onConfirm,
  icon,
  duration = 1100,
  size = "sm",
  className,
}: {
  label: string;
  holdingLabel?: string;
  confirmedLabel?: string;
  /** Asked in the dialog when the button is clicked without holding. */
  question: ReactNode;
  onConfirm: () => void | Promise<void>;
  icon?: ReactNode;
  duration?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "holding" | "confirmed">("idle");
  const [asking, setAsking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const done = useRef(onConfirm);
  done.current = onConfirm;
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  // If the action leaves this button on screen (it failed, or kept the page), settle back after a beat.
  useEffect(() => {
    if (state !== "confirmed") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  const start = () => {
    if (state !== "idle") return;
    held.current = true;
    setState("holding");
    timer.current = setTimeout(() => {
      setState("confirmed");
      void done.current();
    }, duration);
  };
  const release = () => {
    if (state === "holding") {
      if (timer.current) clearTimeout(timer.current);
      setState("idle");
    }
  };

  const text = (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {state === "holding" ? holdingLabel : label}
    </span>
  );
  return (
    <>
      <button
        type="button"
        aria-label={`${label}. Press and hold to confirm`}
        data-state={state}
        className={cx(
          "press relative isolate inline-flex shrink-0 touch-none select-none items-center justify-center overflow-hidden whitespace-nowrap rounded-full font-medium text-destructive [-webkit-touch-callout:none]",
          "bg-destructive/10 hover:bg-destructive/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          size === "sm" ? "h-8 px-3.5 text-[13px]" : "h-9 px-4 text-sm",
          className,
        )}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key !== " " && e.key !== "Enter") return;
          release();
          // Keyboard holds don't fire a click afterwards, so clear the flag here.
          held.current = false;
        }}
        onBlur={release}
        onClick={() => {
          // A click that wasn't a hold: ask instead.
          if (!held.current && state === "idle") setAsking(true);
          held.current = false;
        }}
      >
        <span className={cx("transition-opacity duration-150", state === "confirmed" && "opacity-0")}>{text}</span>
        {/* The fill: clipped from the right, swept open while held, snapped shut on release. */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-destructive text-white"
          style={{
            clipPath: state === "idle" ? "inset(0 100% 0 0)" : "inset(0 0 0 0)",
            transition: state === "holding" ? `clip-path ${duration}ms linear` : "clip-path 180ms var(--ease-out)",
          }}
        >
          {state === "confirmed" ? (
            <span className="t-pop inline-flex items-center gap-1.5">
              <Check className="size-3.5" /> {confirmedLabel}
            </span>
          ) : (
            text
          )}
        </span>
        <span className="sr-only" role="status">
          {state === "confirmed" ? confirmedLabel : ""}
        </span>
      </button>
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent size="confirm">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription className="text-[14px] text-muted-foreground">{question}</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setAsking(false)}>Cancel</Button>
            <Button
              variant="destructive"
              data-solid=""
              onClick={() => {
                setAsking(false);
                setState("confirmed");
                void done.current();
              }}
            >
              {label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
