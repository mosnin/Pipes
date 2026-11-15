"use client";

import type { ChangeEvent, ComponentProps, ReactNode } from "react";
import { IconButton } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Small, editor-only parts. Everything here is built from the Company OS
 * tokens: monochrome structure, hue only where a value carries status.
 */

export type Tone = "positive" | "caution" | "critical" | "agent" | "info" | "neutral";

const TONE_PILL: Record<Tone, string> = {
  positive: "bg-positive-wash text-positive-text",
  caution: "bg-caution-wash text-caution-text",
  critical: "bg-critical-wash text-critical-text",
  agent: "bg-agent-wash text-agent-text",
  info: "bg-info-wash text-info-text",
  neutral: "bg-neutral-wash text-ink-2"
};

const TONE_DOT: Record<Tone, string> = {
  positive: "bg-positive",
  caution: "bg-caution",
  critical: "bg-critical",
  agent: "bg-agent",
  info: "bg-info",
  neutral: "bg-neutral"
};

/** A status pill: a dot plus a word, so colour is never the only carrier. */
export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }): ReactNode {
  return (
    <span className={cn("inline-flex h-[20px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 t-micro", TONE_PILL[tone], className)}>
      <span aria-hidden="true" className={cn("size-[6px] shrink-0 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}

export function severityTone(severity: string): Tone {
  if (severity === "error") return "critical";
  if (severity === "warning") return "caution";
  return "neutral";
}

/** Maps a run, batch or approval status word onto a signal role. */
export function statusTone(status: string | undefined): Tone {
  const value = (status ?? "").toLowerCase();
  if (/(fail|error|reject|block|revoked|conflict)/.test(value)) return "critical";
  if (/(complete|succeed|success|approved|applied|accepted|done|merged)/.test(value)) return "positive";
  if (/(pending|planning|tooling|applying|running|progress|review|waiting|open|draft)/.test(value)) return "caution";
  return "neutral";
}

/** A pane's section heading, sentence case, with an optional trailing control. */
export function SectionLabel({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }): ReactNode {
  return (
    <div className={cn("flex min-h-[28px] items-center justify-between gap-4", className)}>
      <h3 className="t-label-caps text-ink">{children}</h3>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** A quiet sentence for a section with nothing in it yet. */
export function Quiet({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <p className={cn("t-caption text-ink-3", className)}>{children}</p>;
}

/** A discrete row inside a pane: the `--surface-object` rung with its hairline. */
export function ObjectRow({ className, ...props }: ComponentProps<"div">): ReactNode {
  return <div className={cn("flex flex-col gap-2 rounded-10 border border-hairline bg-object px-5 py-4", className)} {...props} />;
}

/** Shortcut chord rendered as separate keycaps. */
export function Chord({ keys }: { keys: string[] }): ReactNode {
  return (
    <span className="inline-flex items-center">
      {keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
    </span>
  );
}

/** An icon-only toolbar control: tooltip names it and shows its shortcut. */
export function ToolButton({
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  children
}: {
  label: string;
  shortcut?: string[];
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactNode {
  return (
    <Tooltip
      content={
        <span className="inline-flex items-center gap-4">
          {label}
          {shortcut ? <span className="inline-flex items-center opacity-80">{shortcut.join(" ")}</span> : null}
        </span>
      }
      side="bottom"
    >
      <span className="inline-flex">
        <IconButton label={label} size="md" aria-pressed={pressed} disabled={disabled} onClick={onClick}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function ToolbarRule(): ReactNode {
  return <span aria-hidden="true" className="mx-1 hidden h-[20px] w-px shrink-0 bg-hairline sm:block" />;
}

/** A native checkbox in the accent (the checked state is an invitation to act). */
export function CheckRow({
  checked,
  disabled,
  onChange,
  children,
  className
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <label className={cn("flex cursor-pointer items-start gap-4 t-caption text-ink-2", disabled && "cursor-not-allowed text-ink-4", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-[2px] size-[14px] shrink-0 accent-[var(--accent)] focus-ring"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

/** Label-over-value pair for small facts. */
export function Fact({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="t-micro text-ink-3">{label}</span>
      <span className="t-body-medium tabular-nums text-ink">{children}</span>
    </div>
  );
}
