"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * LEDGER INSTRUMENT — Tooltip (§9.38, §2.3).
 *
 * The tooltip is the ONE micro-surface that inverts: near-black on white in
 * light mode, near-white on near-black in dark. It has to read instantly against
 * any rung it is thrown over, and inversion is the only treatment that does that
 * without spending colour.
 *
 * It never contains interactive content — that is a popover. `disableHoverableContent`
 * enforces it structurally rather than by convention: the panel closes as the
 * pointer leaves the trigger, so nothing inside it can be reached to be clicked.
 *
 * This replaces every native `title=` attribute in the codebase.
 */

/**
 * Radix's Root throws without a Provider ancestor. Rather than making every call
 * site remember one, `Tooltip` supplies its own when it is not already inside a
 * shared scope — this flag is how it knows, since reading Radix's own context
 * would be the throw we are avoiding.
 */
const TooltipScope = createContext(false);

export interface TooltipProviderProps {
  children: ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps): ReactNode {
  return (
    <TooltipScope.Provider value={true}>
      <TooltipPrimitive.Provider
        // §9.38: 400ms hover intent. Focus-visible opens with no delay at all,
        // which Radix does natively. `skipDelayDuration` is the "0ms if a sibling
        // is already open" rule — moving along a toolbar should not re-arm the
        // intent timer on every icon.
        delayDuration={400}
        skipDelayDuration={300}
        disableHoverableContent
      >
        {children}
      </TooltipPrimitive.Provider>
    </TooltipScope.Provider>
  );
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({
  content,
  children,
  side = "top",
}: TooltipProps): ReactNode {
  const scoped = useContext(TooltipScope);

  // Empty is designed (§P4): with nothing to say there is no tooltip at all —
  // not an empty black rectangle that opens on every hover.
  if (content === null || content === undefined || content === "") {
    return <>{children}</>;
  }

  // `asChild` needs a single element to merge onto; anything else (a bare string,
  // a fragment) gets a neutral inline box so the trigger still has a geometry.
  const trigger = isValidElement(children) ? children : <span>{children}</span>;

  const tooltip = (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{trigger}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            // Above the palette (300) and every layer that can own a focusable
            // control, below toasts (400) — §5.9's ladder, extended by one rung
            // for the surface that must read over all of them.
            "z-[350] max-w-[260px]",
            "rounded-6 bg-inverse px-4 py-2 t-micro text-ink-inverse shadow-elev-2",
            // §7.3: opacity + a 4px travel from the trigger edge + a 0.98 scale,
            // 200ms in; the exit is the 0.6× rule, opacity and scale only.
            "animate-in fade-in-0 zoom-in-95",
            "animation-duration-[var(--dur-3)] ease-[var(--ease-out)]",
            "data-[side=top]:slide-in-from-bottom-[4px]",
            "data-[side=bottom]:slide-in-from-top-[4px]",
            "data-[side=left]:slide-in-from-right-[4px]",
            "data-[side=right]:slide-in-from-left-[4px]",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "data-[state=closed]:zoom-out-95",
            "data-[state=closed]:animation-duration-[120ms]",
            "data-[state=closed]:ease-[var(--ease-in)]",
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );

  return scoped ? tooltip : <TooltipProvider>{tooltip}</TooltipProvider>;
}
