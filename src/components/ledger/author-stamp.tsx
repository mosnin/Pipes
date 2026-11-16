import type { ReactNode } from "react";
import { Avatar as PodiumAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  label: string;
  /** A person or an agent: agents carry their colour field and the asterisk badge. */
  kind?: "human" | "agent";
  /** A saved profile image wins; the seeded preset is the human fallback. */
  imageUrl?: string | null;
  /** 16 · 20 · 24 · 28 · 40 (§9.25). */
  size?: number;
  className?: string;
}

/**
 * Podium's avatar under the ledger's name: always a circle. People get a soft
 * pastel from their name, agents their colour field and the asterisk badge, so
 * authorship never relies on colour alone. A saved photo wins over both.
 */
export function Avatar({ label, kind = "human", imageUrl, size = 24, className }: AvatarProps): ReactNode {
  return <PodiumAvatar name={label} kind={kind} imageUrl={imageUrl} size={size} className={className} />;
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
