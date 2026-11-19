"use client";

/**
 * First-run guidance, as Podium does it. The first time someone opens a
 * section, a card with a shader banner says what the section is for. "Get
 * started" tracks four real milestones from workspace data and ends with a
 * "You're all set" card and the glimm sweep.
 *
 * Seen state is a per-viewer convenience, so it lives in localStorage. Tests
 * set `pipes.intros` to `off`.
 */
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CirclePlay,
  GitBranch,
  KeyRound,
  LayoutGrid,
  type LucideIcon,
  Plug,
  Send,
  ShieldCheck,
  Sparkles,
  Stamp,
  Timer,
  Users,
  Workflow,
  Zap
} from "@/components/ui/icon";
import type { Palette } from "@/components/ui/shader";

export type IntroKey = "workflows" | "editor" | "runs" | "approvals" | "agents" | "connections" | "triggers";

export interface Intro {
  palette: Palette;
  icons: [LucideIcon, LucideIcon, LucideIcon];
  title: string;
  body: string;
  points: string[];
  cta: string;
}

export const INTROS: Record<IntroKey, Intro> = {
  workflows: {
    palette: "sky",
    icons: [Workflow, Sparkles, Bot],
    title: "Welcome to Pipes",
    body: "One place for the workflows your people and your agents follow.",
    points: ["Steps, loops and approvals", "Every change is versioned", "Any agent can run them"],
    cta: "Look around"
  },
  editor: {
    palette: "lagoon",
    icons: [Workflow, GitBranch, Bot],
    title: "The workflow editor",
    body: "Draw the steps, then write what each one asks of whoever runs it.",
    points: ["Add steps from the library", "Validate before you publish", "Run it to try it"],
    cta: "Start drawing"
  },
  runs: {
    palette: "sunrise",
    icons: [CirclePlay, Bot, Timer],
    title: "Runs",
    body: "Every time an agent or a person walks a workflow, step by step.",
    points: ["See where each run is", "Results kept per version", "Cancel one that went wrong"],
    cta: "Got it"
  },
  approvals: {
    palette: "dusk",
    icons: [Stamp, Users, Bot],
    title: "Approvals",
    body: "Runs stop here when a step needs a person to sign off.",
    points: ["Approve, reject or send back", "The longest wait comes first", "The run carries on at once"],
    cta: "Got it"
  },
  agents: {
    palette: "bloom",
    icons: [Bot, Plug, KeyRound],
    title: "Connect an agent",
    body: "Pipes is an MCP server. Point any agent at it and it can run your workflows.",
    points: ["Claude, ChatGPT, Cursor, yours", "Sign in with OAuth or a token", "Agents see only what you grant"],
    cta: "Got it"
  },
  connections: {
    palette: "lagoon",
    icons: [Plug, ShieldCheck, Bot],
    title: "Connections",
    body: "The MCP servers, APIs and skills your steps call, kept in one place.",
    points: ["Secrets encrypted at rest", "Steps name what they need", "Agents get them per step"],
    cta: "Add a connection"
  },
  triggers: {
    palette: "ember",
    icons: [Zap, Timer, Send],
    title: "Triggers",
    body: "Start runs without anyone pressing Run, and tell other systems what happened.",
    points: ["Webhooks with a secret key", "Schedules in cron", "Signed events out"],
    cta: "Got it"
  }
};

export interface Step {
  id: "workflow" | "agent" | "run" | "teammate";
  label: string;
  doneLabel: string;
  href: string;
  done: boolean;
  palette: Palette;
  icons: LucideIcon[];
}

const STEP_DEFS: Omit<Step, "done">[] = [
  { id: "workflow", label: "Create a workflow", doneLabel: "First workflow created", href: "/dashboard", palette: "sky", icons: [Workflow, LayoutGrid, Sparkles] },
  { id: "agent", label: "Connect an agent", doneLabel: "An agent can reach Pipes", href: "/settings/agents", palette: "bloom", icons: [Bot, Plug, KeyRound] },
  { id: "run", label: "Start a run", doneLabel: "First run started", href: "/dashboard", palette: "sunrise", icons: [CirclePlay, Bot, Timer] },
  { id: "teammate", label: "Invite a teammate", doneLabel: "Teammate invited", href: "/settings/collaboration", palette: "lagoon", icons: [Users, Send, ShieldCheck] }
];

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: intros just show again next time */
  }
};
const seenKey = (key: string) => `pipes.intro.${key}`;
const CELEBRATED = "pipes.intro.celebrated";
const off = () => read("pipes.intros") === "off";

interface OnboardingState {
  intro: IntroKey | null;
  show: (key: IntroKey) => void;
  dismiss: () => void;
  /** Close the card and ask the page to do the card's call to action. */
  accept: () => void;
  steps: Step[];
  doneCount: number;
  /** All four done and celebrated: the Get started row goes away. */
  complete: boolean;
  loaded: boolean;
  celebrate: boolean;
  closeCelebration: () => void;
}

const Ctx = createContext<OnboardingState | null>(null);

export function useOnboarding(): OnboardingState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useOnboarding needs OnboardingProvider");
  return value;
}

/** Show a section's intro the first time this viewer opens it; `onAccept` runs when its main button is pressed. */
export function useIntro(key: IntroKey, onAccept?: () => void): void {
  const ctx = useContext(Ctx);
  const show = ctx?.show;
  useEffect(() => show?.(key), [key, show]);
  useEffect(() => {
    if (!onAccept) return;
    const on = (e: Event) => (e as CustomEvent).detail === key && onAccept();
    window.addEventListener("pipes:intro-cta", on);
    return () => window.removeEventListener("pipes:intro-cta", on);
  });
}

type Progress = Record<Step["id"], boolean>;

export function OnboardingProvider({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const [intro, setIntro] = useState<IntroKey | null>(null);
  const [queue, setQueue] = useState<IntroKey[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrated, setCelebrated] = useState(true);

  useEffect(() => setCelebrated(read(CELEBRATED) === "1"), []);

  // Progress is re-read on every navigation, so a step done on one page ticks off on the next.
  useEffect(() => {
    let live = true;
    fetch("/api/onboarding", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (live && json?.ok) setProgress(json.data as Progress);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pathname]);

  const show = useCallback((key: IntroKey) => {
    if (off() || read(seenKey(key))) return;
    setQueue((q) => (q.includes(key) ? q : [...q, key]));
  }, []);
  useEffect(() => {
    if (intro || !queue.length) return;
    // Never interrupt: if the person already opened a dialog, this intro waits for their next visit.
    if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
      setQueue((q) => q.slice(1));
      return;
    }
    setIntro(queue[0]);
    setQueue((q) => q.slice(1));
  }, [intro, queue]);
  const dismiss = useCallback(() => {
    setIntro((k) => {
      if (k) write(seenKey(k), "1");
      return null;
    });
  }, []);
  const accept = useCallback(() => {
    setIntro((k) => {
      if (k) {
        write(seenKey(k), "1");
        window.dispatchEvent(new CustomEvent("pipes:intro-cta", { detail: k }));
      }
      return null;
    });
  }, []);

  const steps = useMemo<Step[]>(() => STEP_DEFS.map((s) => ({ ...s, done: !!progress?.[s.id] })), [progress]);
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = !!progress && doneCount === steps.length;

  useEffect(() => {
    if (allDone && !celebrated && !off() && !intro) setCelebrate(true);
  }, [allDone, celebrated, intro]);
  const closeCelebration = useCallback(() => {
    write(CELEBRATED, "1");
    setCelebrated(true);
    setCelebrate(false);
  }, []);

  const value: OnboardingState = {
    intro,
    show,
    dismiss,
    accept,
    steps,
    doneCount,
    complete: allDone && celebrated,
    loaded: !!progress,
    celebrate,
    closeCelebration
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
