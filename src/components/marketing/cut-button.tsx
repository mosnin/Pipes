import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/marketing/TrackedLink";

type Variant = "solid" | "outline" | "ghost";
type Size = "md" | "lg";

const VARIANT = {
  solid: "primary",
  outline: "secondary",
  ghost: "ghost",
} as const;

export type Track = { event: string; metadata?: Record<string, unknown> };

/**
 * The site's call to action is the product's button, nothing more: the same
 * heights, radius, fill and focus ring a person meets once they sign in.
 * Pass `track` and the link reports the click through the growth signal
 * endpoint before it navigates, exactly as TrackedLink always has.
 */
export function CutButton({
  href,
  children,
  variant = "solid",
  size = "md",
  className,
  track,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  track?: Track;
}): ReactNode {
  return (
    <Button asChild variant={VARIANT[variant]} size={size} className={className}>
      {track ? (
        <TrackedLink href={href} event={track.event} metadata={track.metadata}>
          {children}
        </TrackedLink>
      ) : (
        <Link href={href}>{children}</Link>
      )}
    </Button>
  );
}
