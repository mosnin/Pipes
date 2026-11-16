"use client";

import type { ReactNode } from "react";
import { AgentMark } from "@/components/ui/avatar";
import { Bot, CircleCheck, Stamp, Workflow } from "@/components/ui/icon";
import { Shader } from "@/components/ui/shader";
import { Sticker } from "@/components/ui/stickers";

/**
 * The right half of the sign-in screens, as Podium draws its own: shader
 * light and a glimpse of the product. Here, a workflow an agent is walking,
 * one step waiting on a person.
 */
const STEPS = [
  { name: "Read the ticket", who: "Triage agent", agent: true, state: "done" as const },
  { name: "Draft a reply", who: "Writer agent", agent: true, state: "done" as const },
  { name: "Approve the reply", who: "You", agent: false, state: "waiting" as const },
  { name: "Send and log it", who: "Writer agent", agent: true, state: "next" as const }
];

export function AuthArt(): ReactNode {
  return (
    <div className="relative hidden overflow-hidden rounded-[20px] lg:block">
      <Shader palette="dusk" className="absolute inset-0" />
      <div className="relative flex h-full flex-col items-center justify-center p-12">
        <div className="relative w-full max-w-[380px]" style={{ animation: "t-enter 700ms var(--ease-podium-out) 150ms both" }}>
          <div className="absolute -top-4 left-6 right-6 h-8 rounded-t-[20px] bg-white/45" aria-hidden />
          <Sticker kind="mochi-laptop" size={92} tilt={10} className="absolute -right-14 -top-16 z-10" />
          <Sticker kind="sparkle-trio" size={54} tilt={-14} className="absolute -bottom-7 -left-6 z-10" />
          <div className="relative rounded-[14px] bg-white/90 p-4 text-[#1b1b2a] shadow-[0_24px_60px_-20px_rgb(40_30_90/0.45)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 font-semibold">
                <Workflow className="size-4" /> Support reply
              </span>
              <span className="flex items-center gap-1.5 text-[#1f9d55]">
                <span className="live-dot size-1.5 rounded-full bg-[#1f9d55]" /> Running
              </span>
            </div>
            <ol className="space-y-1.5">
              {STEPS.map((s) => (
                <li key={s.name} className="flex items-center gap-2.5 rounded-[14px] bg-[#f2f2f5] px-3 py-2.5">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                    style={s.agent ? { background: "linear-gradient(150deg, #f5a8d8, #ff9a6b)", color: "rgb(0 0 0 / 0.72)" } : { background: "linear-gradient(160deg, hsl(211 78% 88%), hsl(211 62% 75%))", color: "hsl(211 45% 24%)" }}
                  >
                    {s.agent ? <Bot className="size-3.5" /> : "Y"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{s.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-[#5b5b6b]">
                      {s.agent ? <AgentMark className="size-2.5 text-[#6d5ce8]" /> : null}
                      {s.who}
                    </span>
                  </span>
                  {s.state === "done" ? <CircleCheck className="size-4 text-[#1f9d55]" /> : null}
                  {s.state === "waiting" ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#ff8000]/15 px-2 py-0.5 text-[11px] font-medium text-[#9a4d00]">
                      <Stamp className="size-3" /> Waiting
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
          <span className="absolute -left-6 top-40 rounded-lg bg-[#0a84ff] px-2 py-1 text-xs font-medium text-white shadow-lg" style={{ animation: "t-enter 600ms var(--ease-podium-out) 500ms both" }}>
            You
          </span>
          <span className="absolute -right-6 bottom-10 rounded-lg bg-agent px-2 py-1 text-xs font-medium text-white shadow-lg" style={{ animation: "t-enter 600ms var(--ease-podium-out) 650ms both" }}>
            Agent
          </span>
        </div>
        <p className="mt-10 max-w-[30ch] text-center text-[19px] font-medium leading-snug tracking-tight text-white drop-shadow-[0_1px_8px_rgb(40_30_90/0.35)]">
          The workflows your agents follow, with a person where it counts.
        </p>
      </div>
    </div>
  );
}
