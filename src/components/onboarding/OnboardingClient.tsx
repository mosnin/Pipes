"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Chip,
  Spinner,
} from "@heroui/react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Wand2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "engineer" | "ops" | "support" | "consultant";
type UseCase =
  | "research"
  | "automation"
  | "support-triage"
  | "custom";
type Method = "blank" | "ai" | "template" | "import";

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  useCase: string;
  complexity: string;
}

// ─── Step constants ────────────────────────────────────────────────────────────

const STEPS = ["Welcome", "Use Case", "Get Started"] as const;

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS: {
  value: Role;
  label: string;
  emoji: string;
  sub: string;
}[] = [
  { value: "engineer", emoji: "🤖", label: "AI / ML Engineer", sub: "Build and orchestrate agents" },
  { value: "ops",      emoji: "⚙️", label: "Ops / Automation",  sub: "Automate workflows at scale" },
  { value: "support",  emoji: "💬", label: "Support / CX",      sub: "Triage and resolve faster" },
  { value: "consultant", emoji: "🎯", label: "Consultant",      sub: "Deliver client solutions" },
];

// ─── Use-case options ─────────────────────────────────────────────────────────

const USE_CASE_OPTIONS: {
  value: UseCase;
  label: string;
  description: string;
}[] = [
  { value: "research",       label: "Multi-agent research system", description: "Coordinate agents to gather, analyse and synthesise information" },
  { value: "automation",     label: "Automation workflow",         description: "Chain tasks and triggers to eliminate manual work" },
  { value: "support-triage", label: "Support triage",             description: "Route, prioritise and resolve customer requests" },
  { value: "custom",         label: "Something custom",           description: "I know what I need — give me a blank canvas" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function selectionClasses(selected: boolean) {
  return [
    "cursor-pointer transition-all duration-150 border-2",
    selected
      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
      : "border-transparent hover:border-indigo-300 bg-default-50 hover:bg-default-100",
  ].join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingClient() {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [role, setRole] = useState<Role | null>(null);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);

  // Recommendations
  const [recommended, setRecommended] = useState<Template[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Action loading
  const [loadingAction, setLoadingAction] = useState(false);

  // ── Fire-and-forget "start" signal on mount ──────────────────────────────
  useEffect(() => {
    void fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
  }, []);

  // ── Fetch recommendations whenever role + useCase are both set ───────────
  useEffect(() => {
    if (!role || !useCase) return;
    setLoadingRecommendations(true);
    fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "recommend", role, useCase }),
    })
      .then((r) => r.json())
      .then((d) => setRecommended(d.data?.recommendedTemplates ?? []))
      .finally(() => setLoadingRecommendations(false));
  }, [role, useCase]);

  // ── Completion signal ─────────────────────────────────────────────────────
  const complete = async (chosenPath: Method) => {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "complete", chosenPath, role, useCase }),
    });
  };

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleBlank = async () => {
    setLoadingAction(true);
    try {
      await complete("blank");
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Untitled System" }),
      });
      const data = await res.json();
      if (data.ok) router.push(`/systems/${data.data.systemId}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAI = async () => {
    setLoadingAction(true);
    try {
      await complete("ai");
      const draftRes = await fetch("/api/ai/generate-system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: `Build a ${useCase} ${role} system` }),
      });
      const draft = await draftRes.json();
      if (!draft.ok) return;
      const commitRes = await fetch("/api/ai/generate-system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commit: true, draft: draft.data }),
      });
      const commit = await commitRes.json();
      if (commit.ok) router.push(`/systems/${commit.data.systemId}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTemplate = async (template: Template) => {
    setLoadingAction(true);
    try {
      await complete("template");
      const res = await fetch(`/api/templates/${template.id}/instantiate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) router.push(`/systems/${data.data.systemId}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleImport = async () => {
    setLoadingAction(true);
    try {
      await complete("import");
      router.push("/dashboard");
    } finally {
      setLoadingAction(false);
    }
  };

  // ── Progress value (0–100) ────────────────────────────────────────────────
  const progressValue = ((step + 1) / STEPS.length) * 100;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 px-4 py-12">
      {/* ── Card shell ── */}
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-3 px-1">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={[
                "text-xs font-medium transition-colors",
                i === step
                  ? "text-indigo-600 dark:text-indigo-400"
                  : i < step
                  ? "text-slate-500 dark:text-slate-400"
                  : "text-slate-300 dark:text-slate-600",
              ].join(" ")}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        {/* Progress bar (Tailwind) */}
        <div className="w-full bg-indigo-100 dark:bg-indigo-900 rounded-full h-1.5 mb-6">
          <div
            style={{ width: `${progressValue}%` }}
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
          />
        </div>

        <Card className="shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Card.Content className="p-8">

            {/* ════════════════════════════════════════════
                STEP 0 — WELCOME + ROLE
            ════════════════════════════════════════════ */}
            {step === 0 && (
              <div className="flex flex-col gap-6">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                    Welcome to Pipes 👋
                  </h1>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">
                    Let&apos;s set up your first system. What&apos;s your role?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <Card
                      key={opt.value}
                      onClick={() => setRole(opt.value)}
                      className={selectionClasses(role === opt.value)}
                    >
                      <Card.Content className="flex flex-col gap-1 p-4">
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          {opt.label}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {opt.sub}
                        </span>
                      </Card.Content>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    isDisabled={!role}
                    onPress={() => setStep(1)}
                    className="bg-indigo-500 hover:bg-indigo-600 font-semibold"
                  >
                    Next <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                STEP 1 — USE CASE
            ════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    What are you building?
                  </h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Pick the closest match — you can customise everything later.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {USE_CASE_OPTIONS.map((opt) => (
                    <Card
                      key={opt.value}
                      onClick={() => setUseCase(opt.value)}
                      className={selectionClasses(useCase === opt.value)}
                    >
                      <Card.Content className="flex flex-row items-start gap-3 p-4">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            {opt.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {opt.description}
                          </p>
                        </div>
                        {useCase === opt.value && (
                          <span className="mt-0.5 text-indigo-500">
                            <ChevronRight size={16} />
                          </span>
                        )}
                      </Card.Content>
                    </Card>
                  ))}
                </div>

                {/* Recommendations preview while loading */}
                {loadingRecommendations && useCase && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                    <Spinner size="sm" />
                    <span>Fetching recommended templates…</span>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button
                    variant="secondary"
                    onPress={() => setStep(0)}
                    className="font-semibold"
                  >
                    <ChevronLeft size={16} /> Back
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={!useCase}
                    onPress={() => setStep(2)}
                    className="bg-indigo-500 hover:bg-indigo-600 font-semibold"
                  >
                    Next <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                STEP 2 — CREATE METHOD
            ════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    How would you like to start?
                  </h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Choose a path — all of them lead to the same editor.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {/* ── From scratch ── */}
                  <Card
                    onClick={() => setSelectedMethod("blank")}
                    className={selectionClasses(selectedMethod === "blank")}
                  >
                    <Card.Content className="flex flex-row items-center gap-4 p-4">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          From scratch
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Start with a blank canvas
                        </p>
                      </div>
                    </Card.Content>
                  </Card>

                  {/* ── AI generated ── */}
                  <Card
                    onClick={() => setSelectedMethod("ai")}
                    className={selectionClasses(selectedMethod === "ai")}
                  >
                    <Card.Content className="flex flex-row items-center gap-4 p-4">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                        <Wand2 size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            AI generated
                          </p>
                          <Chip
                            size="sm"
                            variant="soft"
                            className="h-4 px-1.5 text-[10px] font-semibold"
                          >
                            Builder plan
                          </Chip>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Describe your system, AI drafts it
                        </p>
                      </div>
                    </Card.Content>
                  </Card>

                  {/* ── From template ── */}
                  <Card
                    onClick={() => setSelectedMethod("template")}
                    className={selectionClasses(selectedMethod === "template")}
                  >
                    <Card.Content className="p-4 flex flex-col gap-3">
                      <div className="flex flex-row items-center gap-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                          <Plus size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            From template
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Kick off with a proven starting shape
                          </p>
                        </div>
                      </div>

                      {/* Recommended templates sub-list */}
                      {selectedMethod === "template" && (
                        <>
                          <hr className="border-slate-200 dark:border-slate-700" />
                          {loadingRecommendations ? (
                            <div className="flex items-center gap-2 px-1 py-1 text-xs text-slate-400">
                              <Spinner size="sm" />
                              <span>Loading recommended templates…</span>
                            </div>
                          ) : recommended.length === 0 ? (
                            <p className="text-xs text-slate-400 px-1">
                              No recommendations available — select a different path.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {recommended.slice(0, 3).map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 gap-3"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                      {t.title}
                                    </p>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      <Chip
                                        size="sm"
                                        variant="soft"
                                        className="h-4 px-1 text-[10px]"
                                      >
                                        {t.category}
                                      </Chip>
                                      <Chip
                                        size="sm"
                                        variant="soft"
                                        className="h-4 px-1 text-[10px]"
                                      >
                                        {t.complexity}
                                      </Chip>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onPress={() => handleTemplate(t)}
                                    className="flex-shrink-0 text-xs font-semibold"
                                  >
                                    {loadingAction && <Spinner size="sm" />}
                                    Use this
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </Card.Content>
                  </Card>

                  {/* ── Import schema ── */}
                  <Card
                    onClick={() => setSelectedMethod("import")}
                    className={selectionClasses(selectedMethod === "import")}
                  >
                    <Card.Content className="flex flex-row items-center gap-4 p-4">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-300">
                        <Download size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          Import schema
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Bring an existing pipes_schema_v1 file
                        </p>
                      </div>
                    </Card.Content>
                  </Card>
                </div>

                {/* ── Footer buttons ── */}
                <div className="flex justify-between pt-2">
                  <Button
                    variant="secondary"
                    onPress={() => setStep(1)}
                    isDisabled={loadingAction}
                    className="font-semibold"
                  >
                    <ChevronLeft size={16} /> Back
                  </Button>

                  {selectedMethod && selectedMethod !== "template" && (
                    <Button
                      variant="primary"
                      isDisabled={!selectedMethod}
                      onPress={async () => {
                        if (selectedMethod === "blank") await handleBlank();
                        else if (selectedMethod === "ai") await handleAI();
                        else if (selectedMethod === "import") await handleImport();
                      }}
                      className="bg-indigo-500 hover:bg-indigo-600 font-semibold"
                    >
                      {loadingAction && <Spinner size="sm" />}
                      {loadingAction ? "Setting up…" : <>Get started <ChevronRight size={16} /></>}
                    </Button>
                  )}
                </div>
              </div>
            )}

          </Card.Content>
        </Card>

        {/* Subtle footer note */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-4">
          You can always change this later from your dashboard.
        </p>
      </div>
    </div>
  );
}
