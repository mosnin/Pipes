"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Wand2,
  BookOpen,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Spinner,
  Input,
  Textarea,
  StatusBadge,
  HelpText,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Method = "blank" | "ai" | "template" | "import";

interface Template {
  id: string;
  title: string;
  description: string;
  complexity: string;
}

type StepId = "method" | "details" | "ready";

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

type StepIndicatorProps = {
  steps: { id: StepId; label: string }[];
  current: StepId;
};

function StepIndicator({ steps, current }: StepIndicatorProps) {
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center w-full" aria-label="Progress">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <li
            key={step.id}
            className="flex items-center"
            style={{ flex: idx === steps.length - 1 ? "0 0 auto" : "1 1 0" }}
          >
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={
                  "inline-flex items-center justify-center w-7 h-7 rounded-full t-caption font-semibold border " +
                  (isCompleted
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : isActive
                      ? "bg-white border-indigo-600 text-indigo-700 ring-4 ring-indigo-100"
                      : "bg-white border-black/[0.08] text-[#8E8E93]")
                }
              >
                {isCompleted ? <Check size={14} /> : idx + 1}
              </span>
              <span
                className={
                  "t-label hidden sm:inline " +
                  (isActive
                    ? "font-semibold text-[#111]"
                    : isCompleted
                      ? "text-[#3C3C43]"
                      : "text-[#8E8E93]")
                }
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={
                  "h-px flex-1 mx-3 " +
                  (idx < currentIdx ? "bg-indigo-600" : "bg-black/[0.08]")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Method tile (selectable)
// ---------------------------------------------------------------------------

type MethodTileProps = {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  title: string;
  description: string;
  badge?: string;
};

function MethodTile({
  selected,
  onSelect,
  icon,
  iconBg,
  iconFg,
  title,
  description,
  badge,
}: MethodTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "w-full text-left rounded-[12px] border p-4 transition-all duration-150 " +
        (selected
          ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100"
          : "border-black/[0.08] bg-white hover:border-indigo-300 hover-lift")
      }
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: iconBg, color: iconFg }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="t-label font-semibold text-[#111]">{title}</p>
            {badge != null && <StatusBadge tone="info">{badge}</StatusBadge>}
          </div>
          <p className="t-caption text-[#8E8E93] mt-1 leading-relaxed">
            {description}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={
            "shrink-0 w-4 h-4 rounded-full border-2 mt-1 transition-colors " +
            (selected ? "bg-indigo-600 border-indigo-600" : "border-black/[0.14]")
          }
        />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingClient({
  initialTemplates,
}: {
  initialTemplates: Template[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("method");
  const [method, setMethod] = useState<Method | null>(null);
  const [aiPrompt, setAiPrompt] = useState("Build a multi-agent research system");
  const [systemName, setSystemName] = useState("Untitled System");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplates[0]?.id ?? "",
  );
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    void fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
  }, []);

  const complete = (chosenPath: Method) =>
    fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "complete", chosenPath }),
    });

  const handleBlank = async () => {
    await complete("blank");
    const res = await fetch("/api/systems", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: systemName.trim() || "Untitled System" }),
    });
    const data = await res.json();
    if (data.ok) router.push(`/systems/${data.data.systemId}?new=1`);
  };

  const handleAI = async () => {
    await complete("ai");
    const draftRes = await fetch("/api/ai/generate-system", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: aiPrompt }),
    });
    const draft = await draftRes.json();
    if (!draft.ok) return;
    const commitRes = await fetch("/api/ai/generate-system", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commit: true, draft: draft.data }),
    });
    const commit = await commitRes.json();
    if (commit.ok) router.push(`/systems/${commit.data.systemId}?new=1`);
  };

  const handleTemplate = async () => {
    await complete("template");
    const target = initialTemplates.find((t) => t.id === selectedTemplateId);
    if (!target) return;
    const res = await fetch(`/api/templates/${target.id}/instantiate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.ok) router.push(`/systems/${data.data.systemId}?new=1`);
  };

  const handleImport = async () => {
    await complete("import");
    router.push("/dashboard");
  };

  const finish = async () => {
    if (!method) return;
    setLoadingAction(true);
    try {
      if (method === "blank") await handleBlank();
      else if (method === "ai") await handleAI();
      else if (method === "template") await handleTemplate();
      else if (method === "import") await handleImport();
    } finally {
      setLoadingAction(false);
    }
  };

  const steps: { id: StepId; label: string }[] = [
    { id: "method", label: "Choose path" },
    { id: "details", label: "Configure" },
    { id: "ready", label: "Launch" },
  ];

  const canAdvanceFromMethod = method !== null;
  const canAdvanceFromDetails = useMemo(() => {
    if (method === "ai") return aiPrompt.trim().length > 0;
    if (method === "blank") return systemName.trim().length > 0;
    if (method === "template") return selectedTemplateId.length > 0;
    return true;
  }, [method, aiPrompt, systemName, selectedTemplateId]);

  const goNext = () => {
    if (step === "method") setStep("details");
    else if (step === "details") setStep("ready");
  };

  const goBack = () => {
    if (step === "ready") setStep("details");
    else if (step === "details") setStep("method");
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="surface-subtle min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <GitBranch className="w-4 h-4 text-white" aria-hidden />
          </span>
          <span
            className="text-[17px] font-semibold text-[#111]"
            style={{ letterSpacing: "-0.03em" }}
          >
            Pipes
          </span>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-[16px] shadow-sm-token overflow-hidden">
          {/* Step indicator */}
          <div className="px-6 pt-6 pb-5 border-b border-black/[0.06]">
            <StepIndicator steps={steps} current={step} />
          </div>

          {/* Body */}
          <div className="px-6 py-6 min-h-[360px]">
            {step === "method" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="t-h2 text-[#111]">How would you like to start?</h1>
                  <p className="t-label text-[#8E8E93] mt-1">
                    Pick a path. You can change direction any time.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <MethodTile
                    selected={method === "ai"}
                    onSelect={() => setMethod("ai")}
                    icon={<Wand2 size={18} />}
                    iconBg="#EEF2FF"
                    iconFg="#4F46E5"
                    title="Generate with AI"
                    description="Describe your system. AI drafts a working graph in seconds."
                    badge="Fastest"
                  />
                  <MethodTile
                    selected={method === "template"}
                    onSelect={() => setMethod("template")}
                    icon={<BookOpen size={18} />}
                    iconBg="#ECFDF5"
                    iconFg="#059669"
                    title="Start from a template"
                    description="Proven patterns, ready to customize for your use case."
                  />
                  <MethodTile
                    selected={method === "blank"}
                    onSelect={() => setMethod("blank")}
                    icon={<FileText size={18} />}
                    iconBg="#F5F5F7"
                    iconFg="#3C3C43"
                    title="Blank canvas"
                    description="Start from scratch with full control over every node."
                  />
                  <MethodTile
                    selected={method === "import"}
                    onSelect={() => setMethod("import")}
                    icon={<ArrowRight size={18} />}
                    iconBg="#FFFBEB"
                    iconFg="#D97706"
                    title="Import existing schema"
                    description="Paste pipes_schema_v1 JSON from another workspace."
                  />
                </div>
              </div>
            )}

            {step === "details" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h1 className="t-h2 text-[#111]">Configure your start</h1>
                  <p className="t-label text-[#8E8E93] mt-1">
                    A few details and we will spin up your workspace.
                  </p>
                </div>

                {method === "ai" && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="ai-prompt"
                      className="t-label font-semibold text-[#111]"
                    >
                      What do you want to build?
                    </label>
                    <Textarea
                      id="ai-prompt"
                      rows={5}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="A multi-agent research system that..."
                    />
                    <HelpText>
                      Be specific about agents, inputs, and outputs for better drafts.
                    </HelpText>
                  </div>
                )}

                {method === "blank" && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="system-name"
                      className="t-label font-semibold text-[#111]"
                    >
                      Name your system
                    </label>
                    <Input
                      id="system-name"
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      placeholder="Untitled System"
                    />
                    <HelpText>You can rename it later from the editor.</HelpText>
                  </div>
                )}

                {method === "template" && (
                  <div className="flex flex-col gap-3">
                    <label className="t-label font-semibold text-[#111]">
                      Pick a template
                    </label>
                    {initialTemplates.length === 0 ? (
                      <HelpText>No templates available right now.</HelpText>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {initialTemplates.map((t) => {
                          const selected = selectedTemplateId === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedTemplateId(t.id)}
                              className={
                                "text-left p-3 rounded-[10px] border transition-all " +
                                (selected
                                  ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100"
                                  : "border-black/[0.08] bg-white hover:border-indigo-300")
                              }
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="t-label font-semibold text-[#111] truncate">
                                    {t.title}
                                  </p>
                                  <p className="t-caption text-[#8E8E93] mt-0.5 line-clamp-2">
                                    {t.description}
                                  </p>
                                </div>
                                <StatusBadge tone="neutral">
                                  {t.complexity}
                                </StatusBadge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {method === "import" && (
                  <div className="rounded-[10px] surface-muted p-4 flex flex-col gap-2">
                    <p className="t-label text-[#111] font-semibold">
                      Import from the dashboard
                    </p>
                    <p className="t-caption text-[#8E8E93]">
                      We will take you to the dashboard where you can paste a
                      pipes_schema_v1 JSON document into the import dialog.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === "ready" && (
              <div className="flex flex-col items-center text-center gap-4 py-6">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-600">
                  <Sparkles size={28} />
                </span>
                <div>
                  <h1 className="t-h2 text-[#111]">Ready to launch</h1>
                  <p className="t-label text-[#8E8E93] mt-1 max-w-md">
                    {method === "ai" &&
                      "We will draft a system from your prompt and open it in the editor."}
                    {method === "blank" &&
                      `We will create "${systemName.trim() || "Untitled System"}" and open the editor.`}
                    {method === "template" &&
                      "We will instantiate the template and open the editor."}
                    {method === "import" &&
                      "We will route you to the dashboard to paste your schema."}
                  </p>
                </div>
                <div className="surface-muted rounded-[10px] px-4 py-3 t-caption text-[#3C3C43] inline-flex items-center gap-2">
                  <StatusBadge tone="success" pulse>
                    Ready
                  </StatusBadge>
                  All set. Hit launch when you are ready.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-black/[0.06] bg-white flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onPress={goBack}
              isDisabled={step === "method" || loadingAction}
            >
              <ArrowLeft size={14} />
              Back
            </Button>

            {step === "ready" ? (
              <Button
                variant="primary"
                size="sm"
                onPress={finish}
                isDisabled={loadingAction}
              >
                {loadingAction ? (
                  <Spinner size="xs" />
                ) : (
                  <>
                    Launch
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onPress={goNext}
                isDisabled={
                  (step === "method" && !canAdvanceFromMethod) ||
                  (step === "details" && !canAdvanceFromDetails)
                }
              >
                Next
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>

        <p className="text-center mt-5 t-caption text-[#8E8E93]">
          You can always come back to import or change direction from the dashboard.
        </p>
      </div>
    </div>
  );
}
