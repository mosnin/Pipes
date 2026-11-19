"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COPIED_MS = 1400;

/** Copies text to the clipboard and reports it for a moment. Says nothing if the copy failed. */
export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const copy = (text: string) => {
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (!clipboard) return;
    clipboard.writeText(text).then(
      () => {
        setCopied(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
      },
      () => undefined
    );
  };
  return [copied, copy];
}

/** A small text button that copies `text`. The label flips to "Copied" for a moment. */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }): ReactNode {
  const [copied, copy] = useCopy();
  return (
    <Button type="button" variant="secondary" size="xs" className={cn("min-w-[64px]", className)} onClick={() => copy(text)} aria-live="polite">
      {copied ? "Copied" : label}
    </Button>
  );
}

/**
 * A labelled block of real text to paste somewhere else: a URL, a command, a
 * request. Mono on the inset ground, scrolling sideways rather than wrapping,
 * with the copy action in the caption row so it never covers the text.
 */
export function CodeSnippet({ label, code, className }: { label: ReactNode; code: string; className?: string }): ReactNode {
  return (
    <figure className={cn("min-w-0 overflow-hidden rounded-12 border border-border bg-raised", className)}>
      <figcaption className="flex min-h-[44px] items-center justify-between gap-3 border-b border-hairline px-4 py-1.5">
        <span className="t-caption min-w-0 truncate text-ink-2">{label}</span>
        <CopyButton text={code} />
      </figcaption>
      <pre tabIndex={0} className="focus-ring-inset t-mono-code overflow-x-auto bg-inset px-4 py-3 text-ink outline-none">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

/** The page's own origin, read after mount so the server render never guesses it. */
const noopSubscribe = () => () => undefined;
export function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}
