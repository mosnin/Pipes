"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Banner } from "@/components/ui/banner";
import { Kbd } from "@/components/ui/kbd";
import { ChevronDown, Send } from "@/components/ui/icon";
import { CheckRow, ObjectRow, Quiet, SectionLabel, StatusPill, statusTone } from "@/components/editor/editor-ui";

type Session = { id: string; title: string };
type Run = { id: string; status: string };
type Event = { id: string; type: string; text?: string; status?: string; sequence: number; at: string };
type Proposal = { id: string; actionType: string; rationale: string; status: string; riskClass: string };
type Plan = { summary: string; status: string; confidence: number; steps: Array<{ id: string; title: string; toolNames: string[]; expectedActionTypes: string[] }> };
type ToolCall = { id: string; toolName: string; status: string; startedAt: string; completedAt?: string };
type Approval = { id: string; reason: string; status: string };
type StageRecord = { id: string; stage: string; status: string; summary?: string; at: string };
type RoleActivity = { id: string; role: string; stage: string; summary: string };
type PlanRevision = { id: string; version: number; summary: string; critique?: string; openQuestions: string[]; unresolvedRisks: string[] };
type ProposalBatch = { id: string; stage: string; summary: string; rationale?: string; status: string; proposalIds: string[] };

/** Batch states in plain words. */
const BATCH_STATUS: Record<string, string> = {
  created: "Ready to review",
  review_required: "Needs approval",
  approved: "Approved",
  partially_approved: "Partly applied",
  applied: "Applied",
  rejected: "Discarded"
};
type SubTask = { id: string; title: string; role: string; skillId: string; status: string; stage: string; contextPack: { subsystemId: string; subsystemSummary: string } };
type SkillInvocation = { id: string; taskId: string; skillId: string; status: string; inputSummary: string; outputSummary?: string };
type Reconciliation = { id: string; decision: string; summary: string; inputTaskIds: string[] };
type OrchestrationStep = { id: string; stage: string; decision: string; summary: string; at: string };
type DiffItem = { id: string; proposalId: string; batchId: string; entityType: string; entityId: string; changeType: string; summary: string; rationale: string; riskLevel: string; affectedRegion: string; affectedSubsystem: string; canSelectIndividually: boolean; dependencies: string[] };
type PreviewItem = { diffId: string; entityType: string; entityId: string; changeType: string; previewKind: string; emphasis: "pending_review" | "selected_preview" | "applied"; x?: number; y?: number };
type AffectedRegion = { batchId: string; runId: string; nodeIds: string[]; pipeIds: string[]; subsystemIds: string[]; status: "pending_review" | "applied" };
type MemoryEntry = { id: string; title: string; summary: string; type: string; status: string; confidence: string };
type BuilderStrategy = { id: string; name: string; summary: string; status: string };
type PatternArtifact = { id: string; title: string; summary: string; intendedUse: string; tags: string[] };
type DecisionRecord = { id: string; title: string; decision: string; state: string; rationale: string };
type EvaluationRecord = { id: string; scope: string; type: string; outcome: string; score: { value: number; label: string }; rationale: string; signals: Array<{ key: string; value: number; explanation: string }> };
type StrategyPerformance = { id: string; strategyName: string; overallScore: number; acceptanceRate: number; reviewFriction: number; notes: string };
type SkillPerformance = { id: string; skillId: string; role: string; overallScore: number; successRate: number; acceptedBatchRate: number; notes: string };
type LearningArtifact = { id: string; type: string; title: string; summary: string; confidence: string };
type RunPolicySnapshot = { id: string; risk: { posture: string; safeAutoApplyEnabled: boolean }; approval: { strictness: string }; runtime: { maxRunDurationMs: number; maxProviderCallsPerRun: number }; cost: { maxRunCostUsd: number } };
/** What the workspace's plan allows. AI features need the Builder plan. */
type PlanAccess = { status: "loading" } | { status: "ready"; plan: string; aiGeneration: boolean } | { status: "unknown" };

export function AgentChatPanel({
  systemId,
  systemName,
  systemDescription,
  onRegionFocus,
  onPreviewChange
}: {
  systemId: string;
  systemName: string;
  systemDescription?: string;
  onRegionFocus?: (region: AffectedRegion | null) => void;
  onPreviewChange?: (preview: PreviewItem[]) => void;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [events, setEvents] = useState<Event[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [stages, setStages] = useState<StageRecord[]>([]);
  const [roles, setRoles] = useState<RoleActivity[]>([]);
  const [revisions, setRevisions] = useState<PlanRevision[]>([]);
  const [batches, setBatches] = useState<ProposalBatch[]>([]);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [skillInvocations, setSkillInvocations] = useState<SkillInvocation[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [orchestrationSteps, setOrchestrationSteps] = useState<OrchestrationStep[]>([]);
  const [batchDiffs, setBatchDiffs] = useState<Record<string, DiffItem[]>>({});
  const [selectedDiffByBatch, setSelectedDiffByBatch] = useState<Record<string, string[]>>({});
  const [previewByBatch, setPreviewByBatch] = useState<Record<string, PreviewItem[]>>({});
  const [previewEnabledByBatch, setPreviewEnabledByBatch] = useState<Record<string, boolean>>({});
  const [selectionValidation, setSelectionValidation] = useState<Record<string, { valid: boolean; blockedReason?: string }>>({});
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [strategies, setStrategies] = useState<BuilderStrategy[]>([]);
  const [patterns, setPatterns] = useState<PatternArtifact[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [strategyPerformance, setStrategyPerformance] = useState<StrategyPerformance[]>([]);
  const [skillPerformance, setSkillPerformance] = useState<SkillPerformance[]>([]);
  const [patternLifecycle, setPatternLifecycle] = useState<{ promoted: Array<{ id: string; patternArtifactId: string; reason: string; evidenceScore: number }>; demoted: Array<{ id: string; patternArtifactId: string; reason: string; evidenceScore: number }> }>({ promoted: [], demoted: [] });
  const [learningArtifacts, setLearningArtifacts] = useState<LearningArtifact[]>([]);
  const [policySnapshot, setPolicySnapshot] = useState<RunPolicySnapshot | null>(null);
  const [policyEvents, setPolicyEvents] = useState<{ escalations: Array<{ id: string; reason: string; severity: string }>; usage?: { providerCalls: number; estimatedCostUsd: number; elapsedMs: number } }>({ escalations: [] });
  const [prompt, setPrompt] = useState("");
  const [runStatus, setRunStatus] = useState("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | undefined>();
  const [access, setAccess] = useState<PlanAccess>({ status: "loading" });

  // Check the plan before offering the assistant, so a request never fails on it.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body?.ok && body.data) setAccess({ status: "ready", plan: String(body.data.plan ?? ""), aiGeneration: Boolean(body.data.entitlements?.aiGeneration) });
        else setAccess({ status: "unknown" });
      })
      .catch(() => { if (!cancelled) setAccess({ status: "unknown" }); });
    return () => { cancelled = true; };
  }, []);

  const assistantText = useMemo(() => events.filter((event) => event.type === "assistant_text_delta" || event.type === "assistant_text_completed").map((event) => event.text ?? "").join(""), [events]);

  const refreshSessions = useCallback(async () => {
    const res = await fetch(`/api/agent/sessions?systemId=${systemId}`, { cache: "no-store" });
    const body = await res.json();
    if (!body.ok) return;
    setSessions(body.data);
    if (!sessionId && body.data[0]) setSessionId(body.data[0].id);
  }, [sessionId, systemId]);

  const refreshRunArtifacts = async (runId?: string) => {
    if (!runId) return;
    const [pRes, aRes, tRes, planRes, stageRes, roleRes, revRes, batchRes, subTaskRes, skillRes, reconcileRes, orchestrationRes] = await Promise.all([
      fetch(`/api/agent/proposals?runId=${runId}`, { cache: "no-store" }),
      fetch(`/api/agent/approvals?runId=${runId}`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/tools`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/plan`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/stages`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/roles`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/plan-revisions`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/batches`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/sub-tasks`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/skills`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/reconciliation`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/orchestration`, { cache: "no-store" })
    ]);
    const [pBody, aBody, tBody, planBody, stageBody, roleBody, revBody, batchBody, subTaskBody, skillBody, reconcileBody, orchestrationBody] = await Promise.all([pRes.json(), aRes.json(), tRes.json(), planRes.json(), stageRes.json(), roleRes.json(), revRes.json(), batchRes.json(), subTaskRes.json(), skillRes.json(), reconcileRes.json(), orchestrationRes.json()]);
    if (pBody.ok) setProposals(pBody.data);
    if (aBody.ok) setApprovals(aBody.data);
    if (tBody.ok) setTools(tBody.data);
    if (planBody.ok) setPlan(planBody.data);
    if (stageBody.ok) setStages(stageBody.data);
    if (roleBody.ok) setRoles(roleBody.data);
    if (revBody.ok) setRevisions(revBody.data);
    if (batchBody.ok) setBatches(batchBody.data);
    if (subTaskBody.ok) setSubTasks(subTaskBody.data.tasks);
    if (skillBody.ok) setSkillInvocations(skillBody.data);
    if (reconcileBody.ok) setReconciliations(reconcileBody.data);
    if (orchestrationBody.ok) setOrchestrationSteps(orchestrationBody.data);
    const [memoryRes, strategyRes, patternRes, decisionRes, evalRes, strategyPerfRes, skillPerfRes, patternLifecycleRes, learningRes, policyRes, policyEventsRes] = await Promise.all([
      fetch(`/api/agent/memory?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/strategies?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/patterns?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/decisions?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/evaluations?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/strategy-performance?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/skill-performance?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/pattern-lifecycle?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/learning-artifacts?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/policy`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/policy-events`, { cache: "no-store" })
    ]);
    const [memoryBody, strategyBody, patternBody, decisionBody, evalBody, strategyPerfBody, skillPerfBody, patternLifecycleBody, learningBody, policyBody, policyEventsBody] = await Promise.all([memoryRes.json(), strategyRes.json(), patternRes.json(), decisionRes.json(), evalRes.json(), strategyPerfRes.json(), skillPerfRes.json(), patternLifecycleRes.json(), learningRes.json(), policyRes.json(), policyEventsRes.json()]);
    if (memoryBody.ok) setMemoryEntries(memoryBody.data);
    if (strategyBody.ok) setStrategies(strategyBody.data);
    if (patternBody.ok) setPatterns(patternBody.data);
    if (decisionBody.ok) setDecisions(decisionBody.data);
    if (evalBody.ok) setEvaluations(evalBody.data);
    if (strategyPerfBody.ok) setStrategyPerformance(strategyPerfBody.data);
    if (skillPerfBody.ok) setSkillPerformance(skillPerfBody.data);
    if (patternLifecycleBody.ok) setPatternLifecycle(patternLifecycleBody.data);
    if (learningBody.ok) setLearningArtifacts(learningBody.data);
    if (policyBody.ok) setPolicySnapshot(policyBody.data);
    if (policyEventsBody.ok) setPolicyEvents(policyEventsBody.data);
  };

  useEffect(() => { void refreshSessions(); }, [refreshSessions]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const create = await fetch("/api/agent/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, title: `Conversation about ${systemName}` }) });
    const body = await create.json();
    if (!body.ok) throw new Error(body.error ?? "session_create_failed");
    setSessionId(body.data.id);
    return body.data.id as string;
  };

  const loadBatchDiffs = async (runId: string, batchId: string) => {
    const res = await fetch(`/api/agent/runs/${runId}/batches/${batchId}`, { cache: "no-store" });
    const body = await res.json();
    if (!body.ok) return;
    setBatchDiffs((prev) => ({ ...prev, [batchId]: body.data }));
    setSelectedDiffByBatch((prev) => ({ ...prev, [batchId]: prev[batchId] ?? body.data.map((item: DiffItem) => item.id) }));
    setPreviewEnabledByBatch((prev) => ({ ...prev, [batchId]: prev[batchId] ?? true }));
  };

  const refreshPreview = async (runId: string, batchId: string, selectedDiffIds: string[], previewEnabled: boolean) => {
    const res = await fetch(`/api/agent/runs/${runId}/batches/${batchId}/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selectedDiffIds, previewEnabled })
    });
    const body = await res.json();
    if (!body.ok) return;
    setPreviewByBatch((prev) => ({ ...prev, [batchId]: body.data }));
    onPreviewChange?.(body.data);
  };

  const refreshRegion = async (runId: string, batchId: string, selectedProposalIds: string[]) => {
    const res = await fetch(`/api/agent/runs/${runId}/batches/${batchId}/region`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selectedProposalIds })
    });
    const body = await res.json();
    if (body.ok) onRegionFocus?.(body.data);
  };

  const validateSelection = async (runId: string, batchId: string, selectedDiffIds: string[]) => {
    const res = await fetch(`/api/agent/runs/${runId}/batches/${batchId}/selection/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selectedDiffIds })
    });
    const body = await res.json();
    if (body.ok) setSelectionValidation((prev) => ({ ...prev, [batchId]: { valid: body.data.valid, blockedReason: body.data.blockedReason } }));
  };

  const applySelectionDecision = async (batchId: string, decision: "approve_all" | "reject_all" | "approve_selected") => {
    if (!activeRunId) return;
    const selectedDiffIds = selectedDiffByBatch[batchId] ?? [];
    const res = await fetch(`/api/agent/runs/${activeRunId}/batches/${batchId}/selection`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, selectedDiffIds })
    });
    const body = await res.json();
    if (!body.ok) return;
    await refreshRunArtifacts(activeRunId);
    await loadBatchDiffs(activeRunId, batchId);
    await refreshPreview(activeRunId, batchId, selectedDiffIds, previewEnabledByBatch[batchId] ?? true);
    await refreshRegion(activeRunId, batchId, []);
  };

  const runPrompt = async () => {
    if (!prompt.trim()) return;
    setRunError(null);
    try {
      await askAssistant();
    } catch (error) {
      setRunStatus("failed");
      setRunError(error instanceof Error && error.message && !/_/.test(error.message) ? error.message : "The assistant could not answer. Try again in a moment.");
    }
  };

  const askAssistant = async () => {
    const sid = await ensureSession();
    setRunStatus("planning");
    setEvents([]); setApprovals([]); setTools([]); setPlan(null); setProposals([]); setStages([]); setRoles([]); setRevisions([]); setBatches([]); setSubTasks([]); setSkillInvocations([]); setReconciliations([]); setOrchestrationSteps([]);
    setBatchDiffs({}); setSelectedDiffByBatch({}); setPreviewByBatch({}); setPreviewEnabledByBatch({}); setSelectionValidation({});
    const createRun = await fetch("/api/agent/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: sid, systemId, message: prompt }) });
    const runBody = await createRun.json();
    if (!runBody.ok) throw new Error(typeof runBody.error === "string" ? runBody.error : "");
    const run = runBody.data as { run: Run };
    setActiveRunId(run.run.id);
    await fetch("/api/agent/collaboration", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: run.run.id, systemId, mode: "reviewing", currentStage: "planning" }) });

    const streamRes = await fetch(`/api/agent/runs/${run.run.id}/stream`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: prompt, systemName, systemDescription }) });
    if (!streamRes.body) throw new Error("");

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        if (!chunk.startsWith("data:")) continue;
        const payload = JSON.parse(chunk.slice(5).trim()) as Event;
        setEvents((prev) => [...prev, payload]);
        if (payload.status) setRunStatus(payload.status);
      }
      await refreshRunArtifacts(run.run.id);
      const latestBatches = await fetch(`/api/agent/runs/${run.run.id}/batches`, { cache: "no-store" }).then((res) => res.json()).catch(() => ({ ok: false }));
      if (latestBatches.ok) {
        for (const batch of latestBatches.data as ProposalBatch[]) {
          await loadBatchDiffs(run.run.id, batch.id);
          const selected = selectedDiffByBatch[batch.id] ?? [];
          await refreshPreview(run.run.id, batch.id, selected, previewEnabledByBatch[batch.id] ?? true);
        }
      }
    }
    await refreshRunArtifacts(run.run.id);
  };

  const decideApproval = async (requestId: string, decision: "approved" | "rejected") => {
    await fetch(`/api/agent/approvals/${requestId}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
    await refreshRunArtifacts(activeRunId);
  };

  const busy = runStatus === "tooling" || runStatus === "planning" || runStatus === "applying";
  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  // A batch with no edits in it (a bookkeeping record) has nothing to review.
  const reviewableBatches = batches.filter((batch) => batch.proposalIds.length > 0);
  // Some rationales are internal bookkeeping (snake_case ids); only plain sentences are shown.
  const plainText = (text?: string) => (text && !/\b[a-z0-9]+_[a-z0-9_]+\b/i.test(text) ? text : undefined);

  if (access.status === "loading") {
    return <div className="px-3 py-3"><Quiet>Checking your plan…</Quiet></div>;
  }

  if (access.status === "ready" && !access.aiGeneration) {
    return (
      <div className="flex flex-col gap-2 px-3 py-3">
        <Banner
          title="The assistant is part of the Builder plan"
          action={<Button asChild size="xs" variant="ghost"><Link href="/settings/billing">See plans</Link></Button>}
        >
          It proposes edits to this workflow that you review before they apply. Your workspace is on the {access.plan} plan.
        </Banner>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <div className="flex flex-col gap-2">
        {runStatus !== "idle" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={statusTone(runStatus)} className="capitalize">{runStatus}</StatusPill>
          </div>
        ) : null}
        {sessions.length > 1 ? (
          <Select
            aria-label="Conversation"
            size="sm"
            value={sessionId ?? ""}
            onValueChange={(value) => setSessionId(value)}
            options={sessions.map((s) => ({ value: s.id, label: s.title }))}
            placeholder="Choose a conversation"
          />
        ) : null}
        <form
          className="flex flex-col gap-1.5 rounded-12 border border-border bg-object p-1.5"
          onSubmit={(event) => { event.preventDefault(); if (!busy) void runPrompt(); }}
        >
          <Textarea
            aria-label="Ask the assistant"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !busy) { event.preventDefault(); void runPrompt(); }
            }}
            placeholder="Describe a change, such as: add a human approval before anything is sent"
            className="min-h-[72px] border-transparent bg-transparent px-1 py-0.5 hover:border-transparent"
          />
          <div className="flex items-center justify-between gap-1.5">
            <span className="hidden items-center gap-1 t-micro text-ink-3 sm:inline-flex"><Kbd>⌘</Kbd><Kbd>↵</Kbd>to ask</span>
            <Button type="submit" size="sm" variant="secondary" disabled={busy || !prompt.trim()} loading={busy} className="ml-auto">
              <Send aria-hidden="true" />
              Ask
            </Button>
          </div>
        </form>
        {runError ? <Banner role="critical" title="No answer this time" action={<Button size="xs" variant="ghost" onClick={() => setRunError(null)}>Dismiss</Button>}>{runError}</Banner> : null}
      </div>

      {pendingApprovals.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <SectionLabel action={<span className="t-micro tabular-nums text-ink-3">{pendingApprovals.length}</span>}>Waiting for your approval</SectionLabel>
          {pendingApprovals.map((approval) => (
            <ObjectRow key={approval.id} className="gap-1.5">
              <p className="t-caption text-ink">{approval.reason}</p>
              <div className="flex gap-1">
                <Button size="xs" variant="primary" onClick={() => decideApproval(approval.id, "approved")}>Approve</Button>
                <Button size="xs" variant="ghost" onClick={() => decideApproval(approval.id, "rejected")}>Reject</Button>
              </div>
            </ObjectRow>
          ))}
        </div>
      ) : null}

      {assistantText ? (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Answer</SectionLabel>
          <p className="whitespace-pre-wrap t-body-read text-ink">{assistantText}</p>
        </div>
      ) : runStatus === "idle" ? (
        <div className="flex flex-col gap-1">
          <p className="t-body-medium text-ink">Ask for a change to this workflow</p>
          <p className="t-caption text-ink-3">The assistant reads the workflow and proposes edits, such as new steps, routes or approvals. Nothing changes until you review the edits and apply them.</p>
        </div>
      ) : null}

      {reviewableBatches.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <SectionLabel action={<span className="t-micro tabular-nums text-ink-3">{reviewableBatches.length}</span>}>Proposed edits</SectionLabel>
          {reviewableBatches.map((batch) => {
            const loaded = batchDiffs[batch.id];
            const diffs = loaded ?? [];
            const selected = selectedDiffByBatch[batch.id] ?? [];
            const validation = selectionValidation[batch.id];
            const previewEnabled = previewEnabledByBatch[batch.id] ?? true;
            return (
              <ObjectRow key={batch.id} className="gap-2">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="t-body-medium text-ink">{batch.summary}</span>
                    {plainText(batch.rationale) ? <span className="t-caption text-ink-3">{plainText(batch.rationale)}</span> : null}
                  </div>
                  <StatusPill tone={statusTone(batch.status)}>{BATCH_STATUS[batch.status] ?? batch.status.replace(/_/g, " ")}</StatusPill>
                </div>
                {validation && !validation.valid ? <p className="t-caption text-critical-text">{validation.blockedReason}</p> : null}
                {diffs.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {diffs.map((diff) => (
                      <li key={diff.id}>
                        <CheckRow
                          checked={selected.includes(diff.id)}
                          onChange={async (event) => {
                            const next = event.target.checked ? [...selected, diff.id] : selected.filter((id) => id !== diff.id);
                            setSelectedDiffByBatch((prev) => ({ ...prev, [batch.id]: next }));
                            if (activeRunId) {
                              await validateSelection(activeRunId, batch.id, next);
                              await refreshPreview(activeRunId, batch.id, next, previewEnabledByBatch[batch.id] ?? true);
                              await refreshRegion(activeRunId, batch.id, diffs.filter((d) => next.includes(d.id)).map((d) => d.proposalId));
                            }
                          }}
                          disabled={!diff.canSelectIndividually && diff.dependencies.length > 0 && !selected.includes(diff.id)}
                        >
                          <span className="block text-ink">{diff.summary}</span>
                          {plainText(diff.rationale) && diff.rationale !== batch.rationale ? <span className="block text-ink-3">{diff.rationale}</span> : null}
                          {diff.dependencies.length ? <span className="block text-ink-3">Needs another edit in this batch to apply first.</span> : null}
                        </CheckRow>
                      </li>
                    ))}
                  </ul>
                ) : loaded ? null : <Quiet>Loading the edits…</Quiet>}
                <div className="flex flex-wrap gap-1">
                  <Button size="xs" variant="primary" onClick={() => applySelectionDecision(batch.id, "approve_selected")}>Apply selected</Button>
                  <Button size="xs" variant="secondary" onClick={() => applySelectionDecision(batch.id, "approve_all")}>Apply all</Button>
                  <Button size="xs" variant="destructive" onClick={() => applySelectionDecision(batch.id, "reject_all")}>Discard all</Button>
                </div>
                <div className="flex flex-wrap gap-1 border-t border-hairline pt-1.5">
                  <Button size="xs" variant="ghost" aria-pressed={previewEnabled} onClick={async () => {
                    const next = !previewEnabled;
                    setPreviewEnabledByBatch((prev) => ({ ...prev, [batch.id]: next }));
                    if (activeRunId) await refreshPreview(activeRunId, batch.id, selected, next);
                  }}>{previewEnabled ? "Hide preview" : "Show preview"}</Button>
                  <Button size="xs" variant="ghost" onClick={() => activeRunId && refreshRegion(activeRunId, batch.id, diffs.filter((d) => selected.includes(d.id)).map((d) => d.proposalId))}>Show on canvas</Button>
                </div>
              </ObjectRow>
            );
          })}
        </div>
      ) : null}

      {activeRunId ? (
        <div className="flex flex-col">
          {/* How the assistant got there. Closed by default: it is for debugging the assistant, not for reviewing edits. */}
          <Disclosure title="Details">
            <Lines title="Plan" empty="No plan yet." rows={(plan?.steps ?? []).map((step, index) => ({ id: step.id, text: <><span className="tabular-nums text-ink-4">{index + 1}</span> <span className="text-ink">{step.title}</span></> }))} />
            {plan ? <p className="t-caption text-ink-3">{plan.summary} <span className="tabular-nums">Confidence {Math.round(plan.confidence * 100)}%.</span></p> : null}
            <Lines title="Stages" empty="No stages yet." rows={stages.map((stage) => ({ id: stage.id, text: <><span className="t-mono-micro text-ink">{stage.stage}</span> · {stage.status}{stage.summary ? ` · ${stage.summary}` : ""}</> }))} />
            <Lines title="Tools" empty="No tool calls yet." rows={tools.map((tool) => ({ id: tool.id, text: <><span className="t-mono-micro text-ink">{tool.toolName}</span> · {tool.status}</> }))} />
            <Lines title="Actions" empty="No actions yet." rows={proposals.map((p) => ({ id: p.id, text: <><span className="t-mono-micro text-ink">{p.actionType}</span> · {p.status} · {p.riskClass}</> }))} />
            <Lines title="Plan revisions" empty="No revisions yet." rows={revisions.map((rev) => ({ id: rev.id, text: <><span className="tabular-nums text-ink">v{rev.version}</span> {rev.summary}{rev.critique ? `. Critique: ${rev.critique}` : ""}</> }))} />
            <Lines title="Specialist roles" empty="No role activity yet." rows={roles.map((role) => ({ id: role.id, text: <><span className="text-ink">{role.role}</span> at <span className="t-mono-micro">{role.stage}</span> · {role.summary}</> }))} />
            <Lines title="Sub-tasks" empty="No delegated sub-tasks yet." rows={subTasks.map((task) => ({ id: task.id, text: <><span className="text-ink">{task.title}</span> · {task.role} · {task.status}</> }))} />
            <Lines title="Skills" empty="No skill invocations yet." rows={skillInvocations.map((skill) => ({ id: skill.id, text: <><span className="t-mono-micro text-ink">{skill.skillId}</span> · {skill.status} · {skill.inputSummary}</> }))} />
            <Lines title="Orchestration" empty="No orchestration steps yet." rows={orchestrationSteps.map((step) => ({ id: step.id, text: <><span className="t-mono-micro">{step.stage}</span> · {step.decision} · {step.summary}</> }))} />
            <Lines title="Reconciliation" empty="No reconciliation records yet." rows={reconciliations.map((r) => ({ id: r.id, text: <>{r.decision} · {r.summary} <span className="tabular-nums">({r.inputTaskIds.length} tasks)</span></> }))} />
            <Lines title="Memory" empty="Nothing remembered yet." rows={memoryEntries.slice(0, 6).map((entry) => ({ id: entry.id, text: <><span className="text-ink">{entry.title}</span> · {entry.confidence}</> }))} />
            <Lines title="Strategies" empty="No strategies yet." rows={strategies.slice(0, 4).map((strategy) => ({ id: strategy.id, text: <><span className="text-ink">{strategy.name}</span> · {strategy.status}</> }))} />
            <Lines title="Patterns" empty="No saved patterns." rows={patterns.slice(0, 5).map((pattern) => ({ id: pattern.id, text: <><span className="text-ink">{pattern.title}</span> · {pattern.intendedUse}</> }))} />
            <Lines title="Decisions" empty="No decisions recorded." rows={decisions.slice(0, 5).map((decision) => ({ id: decision.id, text: <>{decision.state} · <span className="text-ink">{decision.title}</span></> }))} />
            <Lines title="Evaluation" empty="No evaluations yet." rows={evaluations.slice(0, 6).map((row) => ({ id: row.id, text: <><span className="t-mono-micro">{row.scope}:{row.type}</span> · <span className="tabular-nums text-ink">{Math.round(row.score.value * 100)}%</span> · {row.outcome}</> }))} />
            <Lines title="Strategy results" empty="No strategy results yet." rows={strategyPerformance.map((row) => ({ id: row.id, text: <><span className="text-ink">{row.strategyName}</span> · <span className="tabular-nums">score {Math.round(row.overallScore * 100)} · accepted {Math.round(row.acceptanceRate * 100)}%</span></> }))} />
            <Lines title="Skill results" empty="No skill results yet." rows={skillPerformance.map((row) => ({ id: row.id, text: <><span className="t-mono-micro text-ink">{row.skillId}</span> · <span className="tabular-nums">score {Math.round(row.overallScore * 100)} · success {Math.round(row.successRate * 100)}%</span></> }))} />
            <Lines title="Patterns promoted or retired" empty="None." rows={[
              ...patternLifecycle.promoted.slice(0, 4).map((row) => ({ id: row.id, text: <><span className="text-ink">Promoted</span> · {row.reason}</> })),
              ...patternLifecycle.demoted.slice(0, 4).map((row) => ({ id: row.id, text: <><span className="text-ink">Retired</span> · {row.reason}</> }))
            ]} />
            <Lines title="Learning" empty="No learning yet." rows={learningArtifacts.slice(0, 6).map((row) => ({ id: row.id, text: <><span className="text-ink">{row.title}</span> · {row.confidence}</> }))} />
            {policySnapshot ? (
              <Lines title="Limits" empty="" rows={[
                { id: "risk", text: <>Risk posture {policySnapshot.risk.posture} · approval {policySnapshot.approval.strictness} · auto-apply {policySnapshot.risk.safeAutoApplyEnabled ? "on" : "off"}</> },
                { id: "usage", text: <span className="tabular-nums">Up to {Math.round(policySnapshot.runtime.maxRunDurationMs / 1000)}s · {policyEvents.usage?.providerCalls ?? 0} model calls · {policyEvents.escalations.length} escalations</span> }
              ]} />
            ) : null}
            <Lines title="Events" empty="No events yet." rows={events.slice(-16).map((e) => ({ id: e.id, text: <><span className="tabular-nums text-ink-4">{e.sequence}</span> <span className="t-mono-micro text-ink">{e.type}</span>{e.text ? ` · ${e.text.slice(0, 96)}` : ""}</> }))} />
          </Disclosure>
        </div>
      ) : null}
    </div>
  );
}

/** A disclosure group: secondary run detail stays one click away, in place. */
function Disclosure({ title, count, children }: { title: string; count?: number; children: ReactNode }): ReactNode {
  return (
    <details className="group border-t border-hairline">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-6 py-2 outline-none focus-ring [&::-webkit-details-marker]:hidden">
        <span className="t-label-caps text-ink">{title}</span>
        {count !== undefined ? <span className="t-micro tabular-nums text-ink-3">{count}</span> : null}
        <ChevronDown aria-hidden="true" size={14} className="ml-auto text-ink-3 transition-transform duration-[var(--dur-2)] group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 pb-4">{children}</div>
    </details>
  );
}

function Lines({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; text: ReactNode }> }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-caption-medium text-ink">{title}</span>
      {rows.length === 0 ? <Quiet>{empty}</Quiet> : rows.map((row) => <p key={row.id} className="t-caption text-ink-3">{row.text}</p>)}
    </div>
  );
}
