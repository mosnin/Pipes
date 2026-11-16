"use client";

import { Check, Copy } from "@/components/ui/icon";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface HashChipProps {
  hash: string;
  /** The revision-detail treatment: all 40 characters at `mono-hash-lg`. */
  full?: boolean;
  className?: string;
}

/** §3.5.2 — a content hash shows exactly seven characters. Never six, never an ellipsis. */
const SHORT_LENGTH = 7;
const COPIED_MS = 1200;

/**
 * LEDGER INSTRUMENT — HashChip (§3.5.2, §9.24).
 *
 * The identifier is the evidence, so it is set in mono with positive tracking
 * and must be scannable character by character. Three rules do the work:
 *
 *   1. Exactly 7 characters — a truncation the reader can rely on, not an
 *      ellipsis that hides a variable number of them. The full 40 live in the
 *      title and on the clipboard.
 *   2. It sits in an inset cavity at `--text-secondary`. A hash rendered in body
 *      colour reads as prose; it is not prose.
 *   3. The copy slot is RESERVED at all times and only its glyph fades in, so
 *      hovering a table of hashes never shifts a single column.
 */
export function HashChip({
  hash,
  full = false,
  className,
}: HashChipProps): ReactNode {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const value = hash.trim();

  const copy = useCallback(() => {
    const clipboard =
      typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (!clipboard || !value) return;
    clipboard.writeText(value).then(
      () => {
        setCopied(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
      },
      () => {
        // Clipboard permission denied. Say nothing rather than claim a copy
        // that did not happen — a false receipt is worse than no receipt.
      },
    );
  }, [value]);

  // Absent renders an em dash at `--text-tertiary` (§3.6), never an empty chip:
  // a chip with nothing in it looks like a hash that failed to load.
  if (!value) {
    return <span className={cn("t-mono-hash text-ink-3", className)}> </span>;
  }

  const label = full ? value : value.slice(0, SHORT_LENGTH);
  const glyph = full ? 16 : 14;

  return (
    <button
      type="button"
      onClick={copy}
      title={value}
      aria-label={`Copy hash ${value}`}
      className={cn(
        "group focus-ring relative inline-flex shrink-0 items-center gap-1.5",
        "border border-hairline bg-inset text-ink-2",
        full
          ? "h-[28px] rounded-6 px-2 t-mono-hash-lg"
          : // §6.5 — the 20px box stays dense and buys its 28px hit target from
            // an invisible inset expansion. The visual box never grows.
            "h-[20px] rounded-4 px-1.5 t-mono-hash before:absolute before:inset-[-4px] before:content-['']",
        className,
      )}
    >
      {/* Overlay rather than substitute: the chip stays exactly as wide as its
          hash while `copied` shows, so a column of chips cannot twitch. The
          label itself does NOT change colour — a successful copy is an
          acknowledgement, not a status (§9.24). */}
      <span className="relative inline-block">
        <span className={cn(copied && "invisible")}>{label}</span>
        {copied ? (
          <span className="absolute inset-0 flex items-center">copied</span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 transition-opacity duration-[var(--dur-1)] ease-linear",
          copied
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {copied ? (
          <Check size={glyph} strokeWidth={1.5} className="text-positive" />
        ) : (
          <Copy size={glyph} strokeWidth={glyph <= 14 ? 1.25 : 1.5} />
        )}
      </span>
    </button>
  );
}
