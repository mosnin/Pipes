"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "@/components/ui/check-circle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Rocket } from "@/components/ui/icon";
import { ProgressRing, ShaderBanner } from "@/components/ui/shader-banner";
import { Sticker } from "@/components/ui/stickers";
import { INTROS, useOnboarding } from "@/lib/onboarding";
import { useSweep } from "@/lib/sweep";
import { cn } from "@/lib/utils";

/** Podium's checklist inset: filled blue checks, dashed circles for to-do. */
function Points({
  items,
}: {
  items: { label: string; done?: boolean }[];
}): ReactNode {
  return (
    <ul className="t-stagger space-y-[11px] rounded-[14px] border border-border bg-subtle px-4 py-[18px]">
      {items.map((p) => (
        <li
          key={p.label}
          className={cn(
            "flex items-start gap-3 text-[15px] leading-[1.4] tracking-[-0.005em]",
            p.done === false ? "text-muted-foreground" : "text-foreground/75",
          )}
        >
          <CheckCircle done={p.done !== false} className="mt-[1px]" />
          <span>{p.label}</span>
        </li>
      ))}
    </ul>
  );
}

const CARD = "max-w-[384px] overflow-hidden rounded-[26px] p-0";

/** First-visit card for a section: shader banner, what it's for, three points, two buttons. */
export function IntroCard(): ReactNode {
  const { intro, dismiss, accept } = useOnboarding();
  const d = intro ? INTROS[intro] : null;
  return (
    <Dialog open={!!d} onOpenChange={(open) => (!open ? dismiss() : undefined)}>
      <DialogContent size="confirm" showClose={false} className={CARD}>
        {d ? (
          <div className="w-full">
            <ShaderBanner
              palette={d.palette}
              icons={d.icons}
              className="h-[148px]"
            />
            <div className="px-6 pb-6 pt-6">
              <div className="t-stagger mb-5 text-center">
                <DialogTitle className="text-[19.5px] font-medium leading-tight tracking-[-0.012em]">
                  {d.title}
                </DialogTitle>
                <DialogDescription className="mx-auto mt-1.5 max-w-[30ch] text-[15.5px] leading-snug text-muted-foreground">
                  {d.body}
                </DialogDescription>
              </div>
              <Points items={d.points.map((label) => ({ label }))} />
              <div className="mt-6 grid grid-cols-2 gap-3.5">
                <Button size="lg" variant="primary" onClick={accept} autoFocus>
                  {d.cta}
                </Button>
                <Button size="lg" variant="secondary" onClick={dismiss}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** "You're all set": the end of Get started. A rare moment, so it gets the glimm sweep. */
export function CelebrationCard({
  workspaceLabel,
}: {
  workspaceLabel: string;
}): ReactNode {
  const { celebrate, closeCelebration, steps } = useOnboarding();
  const sweep = useSweep();
  const swept = useRef(false);
  useEffect(() => {
    if (celebrate && !swept.current) {
      swept.current = true;
      sweep();
    }
  }, [celebrate, sweep]);
  return (
    <Dialog
      open={celebrate}
      onOpenChange={(open) => (!open ? closeCelebration() : undefined)}
    >
      <DialogContent size="confirm" showClose={false} className={CARD}>
        <ShaderBanner palette="sunrise" className="h-[150px]">
          <Sticker
            kind="sparkle-trio"
            size={58}
            tilt={-12}
            className="absolute left-5 top-4 z-[1]"
          />
          <Sticker
            kind="star-burst"
            size={64}
            tilt={10}
            className="absolute right-5 top-5 z-[1]"
          />
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center"
            style={{
              animation: "t-enter 600ms var(--ease-podium-out) 120ms both",
            }}
          >
            <div className="relative w-[72%]">
              <div
                className="absolute -top-3 left-[8%] right-[8%] h-6 rounded-t-[18px] bg-white/70"
                aria-hidden
              />
              <div className="relative rounded-t-[20px] bg-white/95 px-5 pb-6 pt-5 text-left text-[#1b1b1b]">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#2a2a2a]/95 text-[15px] font-semibold text-white">
                    {workspaceLabel.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-medium">
                      {workspaceLabel}
                    </span>
                    <span className="block text-[13px] text-[#0a84ff]">
                      Workflows, agents and runs
                    </span>
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-[#f2f2f2]/95" />
              </div>
              <span className="absolute -left-10 top-10 rounded-lg bg-[#0a84ff]/95 px-2 py-0.5 text-[12px] font-medium text-white shadow-md">
                You
              </span>
              <span className="absolute -right-10 top-4 rounded-lg bg-agent px-2 py-0.5 text-[12px] font-medium text-white shadow-md">
                Agent
              </span>
            </div>
          </div>
        </ShaderBanner>
        <div className="px-6 pb-6 pt-7">
          <div className="mb-6 text-center">
            <DialogTitle className="text-[19.5px] font-medium tracking-[-0.012em]">
              You&apos;re all set
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-[15.5px] text-muted-foreground">
              Here&apos;s what you just set up.
            </DialogDescription>
          </div>
          <Points items={steps.map((s) => ({ label: s.doneLabel }))} />
          <div className="mt-6 grid grid-cols-2 gap-3.5">
            <Button size="lg" variant="primary" asChild>
              <Link href="/runs" onClick={closeCelebration}>
                See your runs
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={closeCelebration}
              autoFocus
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The sidebar's Get started row: a progress ring, and a "Getting started 1 of 4" popover with the next step on a shader. */
export function GetStartedRow({
  rowClassName,
}: {
  rowClassName: (active: boolean) => string;
}): ReactNode {
  const { steps, doneCount, complete, loaded } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) =>
      !panel.current?.contains(e.target as Node) &&
      !anchor.current?.contains(e.target as Node) &&
      setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // The sidebar clips its overflow, so the popover is portalled and placed beside the row (below it on phones).
  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    setPos(
      window.innerWidth < 768
        ? { left: r.left, top: r.bottom + 8 }
        : { left: r.right + 18, top: r.top - 8 },
    );
  }, [open]);
  if (!loaded || complete) return null;
  const next = steps.find((s) => !s.done) ?? steps[steps.length - 1];
  return (
    <div className="relative">
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={rowClassName(open)}
      >
        <Rocket className="size-[15px] shrink-0 stroke-[1.7]" />
        <span className="min-w-0 flex-1 truncate">Get started</span>
        <ProgressRing value={doneCount} total={steps.length} />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={panel}
              role="dialog"
              aria-label="Getting started"
              className="t-pop fixed z-50 w-[280px] rounded-[14px] bg-card p-2 shadow-float"
              style={{
                left: pos.left,
                top: pos.top,
                ["--origin" as string]: "top left",
              }}
            >
              <div className="flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium">
                <Rocket className="size-4 text-muted-foreground" /> Getting
                started
                <span className="tabular ml-auto text-xs text-muted-foreground">
                  {doneCount} of {steps.length}
                </span>
              </div>
              <ol className="mt-1 space-y-px">
                {steps.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={s.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "press flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted",
                        s.done &&
                          "text-muted-foreground line-through decoration-faint",
                      )}
                    >
                      <CheckCircle done={s.done} className="size-4" />
                      {s.label}
                    </Link>
                    {s.id === next.id && !s.done ? (
                      <ShaderBanner
                        palette={s.palette}
                        icons={s.icons}
                        className="mx-1 my-1.5 h-28 rounded-[14px] [&_.glass]:size-10 [&_.glass]:rounded-[14px] [&_.glass_svg]:size-[18px]"
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Open the setup guide
              </Link>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
