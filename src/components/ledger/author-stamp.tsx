import { Bot } from "@/components/ui/icon";
import type { ReactNode } from "react";
import SmoothAgentAvatar from "@/components/smoothui/agent-avatar";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  label: string;
  /** ROUND is a person, SQUARE is a process. This is not decoration (§5.3). */
  kind?: "human" | "agent";
  /** A saved profile image wins; the seeded preset is the human fallback. */
  imageUrl?: string | null;
  /** 16 · 20 · 24 · 28 · 40 (§9.25). */
  size?: number;
  className?: string;
}

/**
 * LEDGER INSTRUMENT — Avatar (§5.3, §9.25).
 *
 * THE LOAD-BEARING RULE OF THIS FILE: human identity is a fully round avatar;
 * agent identity is a rounded square on `--agent-wash`. Authorship is marked by
 * SHAPE first and hue second, which is what makes it survive greyscale,
 * colour-blindness, print and a 16px rendering — none of which a violet-only
 * convention survives. Everywhere a machine can write (timeline, revision
 * history, run detail, key detail) this distinction is the fastest read on the
 * screen.
 *
 * A saved human profile photo is shown when present. Otherwise a deterministic
 * SmoothUI preset is generated from the label, so a person keeps the same
 * recognizable fallback everywhere without storing another identity field.
 * Presets are static in dense ledger views to avoid a wall of ambient motion.
 */
export function Avatar({
  label,
  kind = "human",
  imageUrl,
  size = 24,
  className,
}: AvatarProps): ReactNode {
  const agent = kind === "agent";

  if (!agent && imageUrl) {
    return (
      <span
        role="img"
        aria-label={label}
        style={{ width: size, height: size }}
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-full bg-inset shadow-[inset_0_0_0_1px_var(--neutral-wash)]",
          className,
        )}
      >
        {/* Arbitrary user profile origins cannot be enumerated in next/image's
            remotePatterns. The native image is intentionally clipped here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      </span>
    );
  }

  if (!agent) {
    return (
      <SmoothAgentAvatar
        seed={label}
        size={size}
        animated={false}
        aria-label={`${label} preset avatar`}
        className={cn(
          "shrink-0 shadow-[inset_0_0_0_1px_var(--neutral-wash)]",
          className,
        )}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={`${label} (agent)`}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden",
        cn("bg-agent-wash text-agent-text", agentRadius(size)),
        className,
      )}
    >
      <Bot
        aria-hidden="true"
        size={glyphFor(size)}
        strokeWidth={glyphFor(size) <= 14 ? 1.25 : 1.5}
      />
    </span>
  );
}

export interface AuthorStampProps {
  label: string;
  kind?: "human" | "agent";
  imageUrl?: string | null;
  /** `sm` is the dense meta line (16px mark); `md` is a header or detail row. */
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

/**
 * LEDGER INSTRUMENT — AuthorStamp (§9.25).
 *
 * The mark plus the name. The `· <RelativeTime>` that follows it in a commit row
 * is composed by the row, not by the stamp: the separator belongs to the meta
 * line's rhythm, and a stamp that owned the timestamp could not be reused in a
 * header where no timestamp exists.
 */
export function AuthorStamp({
  label,
  kind = "human",
  imageUrl,
  size = "sm",
  showLabel = true,
  className,
}: AuthorStampProps): ReactNode {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Avatar
        label={label}
        kind={kind}
        imageUrl={imageUrl}
        size={size === "sm" ? 16 : 24}
      />
      {showLabel ? (
        <span className="t-caption min-w-0 truncate text-ink-2">{label}</span>
      ) : null}
    </span>
  );
}

/**
 * `--r-6` at 24px and `--r-8` at 28px+ per §5.3; below that the ratio would
 * round the square into a blob and the human/agent read — the entire point —
 * would be lost, so small marks step down to `--r-4`.
 */
function agentRadius(size: number): string {
  if (size >= 28) return "rounded-8";
  if (size >= 24) return "rounded-6";
  return "rounded-4";
}

/** Roughly 0.55 of the tile, held inside §8.1's legible icon range. */
function glyphFor(size: number): number {
  return Math.min(20, Math.max(12, Math.round(size * 0.55)));
}
