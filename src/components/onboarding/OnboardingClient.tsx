"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@heroui/react";
import { GitBranch, Wand2, BookOpen, FileText, ArrowRight } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
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
    setLoadingAction(true);
    try {
      await complete("blank");
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Untitled System" }),
      });
      const data = await res.json();
      if (data.ok) router.push(`/systems/${data.data.systemId}?new=1`);
    } finally { setLoadingAction(false); }
  };

  const handleAI = async () => {
    setLoadingAction(true);
    try {
      await complete("ai");
      const draftRes = await fetch("/api/ai/generate-system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "Build a multi-agent research system" }),
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
    } finally { setLoadingAction(false); }
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
      if (data.ok) router.push(`/systems/${data.data.systemId}?new=1`);
    } finally { setLoadingAction(false); }
  };

  const handleImport = async () => {
    await complete("import");
    router.push("/dashboard");
  };

  const handleGetStarted = async () => {
    if (selectedMethod === "blank") await handleBlank();
    else if (selectedMethod === "ai") await handleAI();
  };

  const cardBase = "border transition-all duration-150 cursor-pointer";
  const cardSelected = "border-indigo-500 bg-indigo-50/60";
  const cardIdle = "border-black/[0.08] bg-white hover:border-indigo-300";

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <GitBranch className="w-4 h-4 text-white" aria-hidden />
          </span>
          <span className="text-[17px] font-semibold text-[#111]" style={{ letterSpacing: "-0.03em" }}>
            Pipes
          </span>
        </div>

        <h1 className="text-3xl font-bold text-[#111] text-center mb-2" style={{ letterSpacing: "-0.03em" }}>
          How would you like to start?
        </h1>
        <p className="t-body text-[#8E8E93] text-center mb-8">
          Pick a path. You can change direction any time.
        </p>

        <div className="flex flex-col gap-3">

          {/* ── AI Generate ── */}
          <button
            onClick={() => setSelectedMethod("ai")}
            className={`${cardBase} ${selectedMethod === "ai" ? cardSelected : cardIdle} rounded-xl text-left w-full`}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Wand2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="t-label font-semibold text-[#111]">Generate with AI</p>
                </div>
                <p className="t-caption text-[#8E8E93] mt-0.5">Describe your system, AI drafts it in seconds</p>
              </div>
            </div>
          </button>

          {/* ── From Template ── */}
          <button
            onClick={() => setSelectedMethod("template")}
            className={`${cardBase} ${selectedMethod === "template" ? cardSelected : cardIdle} rounded-xl text-left w-full`}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="t-label font-semibold text-[#111]">Start from a template</p>
                <p className="t-caption text-[#8E8E93] mt-0.5">Proven patterns, ready to customise</p>
              </div>
            </div>

            {selectedMethod === "template" && initialTemplates.length > 0 && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                <div className="h-px bg-black/[0.06]" />
                {initialTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.06] bg-white px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="t-label font-semibold text-[#111] truncate">{t.title}</p>
                      <p className="t-caption text-[#8E8E93] mt-0.5 line-clamp-1">{t.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => handleTemplate(t)}
                      isDisabled={loadingAction}
                      className="shrink-0"
                    >
                      {loadingAction ? <Spinner size="sm" /> : <>Use <ArrowRight className="w-3 h-3" /></>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </button>

          {/* ── Blank Canvas ── */}
          <button
            onClick={() => setSelectedMethod("blank")}
            className={`${cardBase} ${selectedMethod === "blank" ? cardSelected : cardIdle} rounded-xl text-left w-full`}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center text-[#8E8E93]">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="t-label font-semibold text-[#111]">Blank canvas</p>
                <p className="t-caption text-[#8E8E93] mt-0.5">Start from scratch, total freedom</p>
              </div>
            </div>
          </button>

        </div>

        {/* Get started button */}
        {selectedMethod && selectedMethod !== "template" && (
          <div className="mt-6">
            <Button
              variant="primary"
              onPress={handleGetStarted}
              isDisabled={loadingAction}
              className="w-full h-12 font-semibold t-body"
            >
              {loadingAction ? <Spinner size="sm" /> : <>Get started <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        )}

        {/* Import link */}
        <div className="mt-6 text-center">
          <button
            onClick={handleImport}
            className="t-caption text-[#8E8E93] hover:text-[#3C3C43] transition-colors"
          >
            Have an existing schema? Import it from the dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
