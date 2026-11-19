"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar as ArcAvatar } from "@/components/arc/avatar/avatar";
import { fieldGradient, paletteFor } from "@/components/ui/shader";
import { cn } from "@/lib/utils";

/**
 * Podium's avatar, for everyone (docs/DESIGN.md, Avatar). Always a circle,
 * built on Arc's Avatar: photos fade in from a soft blur, initials fall back.
 *
 * People get a soft pastel from their name's hue, so a list of people has some
 * colour. Agents get their colour field (the same palette everywhere, picked
 * from the name) with dark initials and the asterisk badge, so an agent is
 * never told apart by colour alone.
 */
export type AvatarKind = "human" | "agent";

function hueOf(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** A person's colour: a soft pastel with readable initials. */
export function personTint(name: string): CSSProperties {
  const h = hueOf(name);
  return { background: `linear-gradient(160deg, hsl(${h} 78% 88%), hsl(${h} 62% 75%))`, color: `hsl(${h} 45% 24%)` };
}

/** An agent's colour: its shader field. */
export function agentField(name: string): CSSProperties {
  return { background: fieldGradient(paletteFor(name)), color: "rgb(0 0 0 / 0.75)" };
}

export function AgentMark({ className, style }: { className?: string; style?: CSSProperties }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className={className} style={style} aria-hidden>
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
    </svg>
  );
}

export interface AvatarProps {
  name: string;
  kind?: AvatarKind;
  imageUrl?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}

export function Avatar({ name, kind = "human", imageUrl, size = 32, online, className }: AvatarProps): ReactNode {
  const isAgent = kind === "agent";
  const photo = imageUrl ?? undefined;
  const fill = isAgent ? agentField(name) : personTint(name);
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <ArcAvatar
        name={`${name.replace(/[^\p{L}\p{N} ]/gu, "") || "?"}${isAgent ? " (agent)" : ""}`}
        src={photo}
        size={size >= 64 ? "xl" : size >= 44 ? "lg" : size >= 32 ? "md" : "sm"}
        status={online === undefined || isAgent ? undefined : online ? "online" : "offline"}
        className="font-medium"
        style={{ width: size, height: size, fontSize: size * 0.38, letterSpacing: "-0.01em", border: 0, boxShadow: "inset 0 0 0 0.5px rgb(0 0 0 / 0.1)", ...(photo ? {} : fill) }}
      />
      {isAgent && size >= 20 ? (
        <span className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-background p-[2px]" title="AI agent">
          <AgentMark style={{ width: Math.max(9, size * 0.3), height: Math.max(9, size * 0.3) }} className="text-foreground/70" />
        </span>
      ) : null}
    </span>
  );
}
