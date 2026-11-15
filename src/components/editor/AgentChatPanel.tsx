"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
type ProposalBatch = { id: string; stage: string; summary: string; status: string; proposalIds: string[] };
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
type CollaborationState = {
  reviewers: Array<{ id: string; userId: string; role: string; status: string }>;
  visibility: Array<{ id: string; userId: string; mode: string; currentStage?: string }>;
  threads: Array<{ id: string; targetType: string; targetId: string; status: string }>;
  comments: Array<{ id: string; threadId: string; targetType: string; targetId: string; authorId: string; body: string; createdAt: string }>;
  handoffs: Array<{ id: string; fromUserId: string; toUserId: string; status: string; note: string; stage: string }>;
  revisions: Array<{ id: string; targetType: string; targetId: string; rationale: string; status: string }>;
  approvalParticipants: Array<{ id: string; approvalRequestId: string; actorId: string; recommendation: string; note?: string }>;
};

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
  const [collaboration, setCollaboration] = useState<CollaborationState>({ reviewers: [], visibility: [], threads: [], comments: [], handoffs: [], revisions: [], approvalParticipants: [] });
  const [policySnapshot, setPolicySnapshot] = useState<RunPolicySnapshot | null>(null);
  const [policyEvents, setPolicyEvents] = useState<{ escalations: Array<{ id: string; reason: string; severity: string }>; usage?: { providerCalls: number; estimatedCostUsd: number; elapsedMs: number } }>({ escalations: [] });
  const [commentBody, setCommentBody] = useState("Looks good, but please verify edge-case behavior.");
  const [handoffTo, setHandoffTo] = useState("usr_1");
  const [strategyChoice, setStrategyChoice] = useState("subsystem_first");
  const [prompt, setPrompt] = useState("Plan and apply a safe reliability improvement, request approval for risky edits.");
  const [runStatus, setRunStatus] = useState("idle");
  const [activeRunId, setActiveRunId] = useState<string | undefined>();

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
    const [memoryRes, strategyRes, patternRes, decisionRes, evalRes, strategyPerfRes, skillPerfRes, patternLifecycleRes, learningRes, collaborationRes, policyRes, policyEventsRes] = await Promise.all([
      fetch(`/api/agent/memory?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/strategies?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/patterns?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/decisions?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/evaluations?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/strategy-performance?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/skill-performance?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/pattern-lifecycle?systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/learning-artifacts?runId=${runId}&systemId=${systemId}`, { cache: "no-store" }),
      fetch(`/api/agent/collaboration?runId=${runId}`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/policy`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/policy-events`, { cache: "no-store" })
    ]);
    const [memoryBody, strategyBody, patternBody, decisionBody, evalBody, strategyPerfBody, skillPerfBody, patternLifecycleBody, learningBody, collaborationBody, policyBody, policyEventsBody] = await Promise.all([memoryRes.json(), strategyRes.json(), patternRes.json(), decisionRes.json(), evalRes.json(), strategyPerfRes.json(), skillPerfRes.json(), patternLifecycleRes.json(), learningRes.json(), collaborationRes.json(), policyRes.json(), policyEventsRes.json()]);
    if (memoryBody.ok) setMemoryEntries(memoryBody.data);
    if (strategyBody.ok) setStrategies(strategyBody.data);
    if (patternBody.ok) setPatterns(patternBody.data);
    if (decisionBody.ok) setDecisions(decisionBody.data);
    if (evalBody.ok) setEvaluations(evalBody.data);
    if (strategyPerfBody.ok) setStrategyPerformance(strategyPerfBody.data);
    if (skillPerfBody.ok) setSkillPerformance(skillPerfBody.data);
    if (patternLifecycleBody.ok) setPatternLifecycle(patternLifecycleBody.data);
    if (learningBody.ok) setLearningArtifacts(learningBody.data);
    if (collaborationBody.ok) setCollaboration(collaborationBody.data);
    if (policyBody.ok) setPolicySnapshot(policyBody.data);
    if (policyEventsBody.ok) setPolicyEvents(policyEventsBody.data);
  };

  useEffect(() => { void refreshSessions(); }, [refreshSessions]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const create = await fetch("/api/agent/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, title: `${systemName} Builder Session` }) });
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
    const sid = await ensureSession();
    setRunStatus("planning");
    setEvents([]); setApprovals([]); setTools([]); setPlan(null); setProposals([]); setStages([]); setRoles([]); setRevisions([]); setBatches([]); setSubTasks([]); setSkillInvocations([]); setReconciliations([]); setOrchestrationSteps([]);
    setBatchDiffs({}); setSelectedDiffByBatch({}); setPreviewByBatch({}); setPreviewEnabledByBatch({}); setSelectionValidation({});
    const createRun = await fetch("/api/agent/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: sid, systemId, message: prompt }) });
    const runBody = await createRun.json();
    if (!runBody.ok) return setRunStatus("failed");
    const run = runBody.data as { run: Run };
    setActiveRunId(run.run.id);
    await fetch("/api/agent/collaboration", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: run.run.id, systemId, mode: "reviewing", currentStage: "planning" }) });

    const streamRes = await fetch(`/api/agent/runs/${run.run.id}/stream`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: prompt, systemName, systemDescription }) });
    if (!streamRes.body) return setRunStatus("failed");

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

  return (
    <div className="flex flex-col gap-6 px-5 py-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={runStatus === "idle" ? "neutral" : statusTone(runStatus)} className="capitalize">{runStatus}</StatusPill>
          <span className="t-micro text-ink-3">Stage <span className="t-mono-micro text-ink-2">{stages.at(-1)?.stage ?? "none yet"}</span></span>
          <span className="ml-auto truncate t-micro text-ink-3">Working on {systemName}</span>
        </div>
        {sessions.length > 0 ? (
          <Select
            aria-label="Builder session"
            size="sm"
            value={sessionId ?? ""}
            onValueChange={(value) => setSessionId(value)}
            options={sessions.map((s) => ({ value: s.id, label: s.title }))}
            placeholder="Choose a session"
          />
        ) : null}
        <form
          className="flex flex-col gap-3 rounded-12 border border-border bg-object p-3"
          onSubmit={(event) => { event.preventDefault(); if (!busy) void runPrompt(); }}
        >
          <Textarea
            aria-label="Ask the builder agent"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !busy) { event.preventDefault(); void runPrompt(); }
            }}
            placeholder="Ask the builder agent to change this system"
            className="min-h-[72px] border-transparent bg-transparent px-2 py-1 hover:border-transparent"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="hidden items-center gap-2 t-micro text-ink-3 sm:inline-flex"><Kbd>⌘</Kbd><Kbd>↵</Kbd>to run</span>
            <Button type="submit" size="sm" variant="primary" disabled={busy} loading={busy} className="ml-auto">
              <Send aria-hidden="true" />
              Run
            </Button>
          </div>
        </form>
      </div>

      {pendingApprovals.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SectionLabel action={<span className="t-micro tabular-nums text-ink-3">{pendingApprovals.length}</span>}>Waiting for your approval</SectionLabel>
          {pendingApprovals.map((approval) => (
            <ObjectRow key={approval.id} className="gap-3">
              <p className="t-caption text-ink">{approval.reason}</p>
              <div className="flex gap-2">
                <Button size="xs" variant="primary" onClick={() => decideApproval(approval.id, "approved")}>Approve</Button>
                <Button size="xs" variant="ghost" onClick={() => decideApproval(approval.id, "rejected")}>Reject</Button>
              </div>
            </ObjectRow>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <SectionLabel>Assistant</SectionLabel>
        {assistantText ? <p className="whitespace-pre-wrap t-body-read text-ink">{assistantText}</p> : <Quiet>Nothing yet. Describe a change above and run it.</Quiet>}
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>Plan</SectionLabel>
        {plan ? (
          <div className="flex flex-col gap-3">
            <p className="t-caption text-ink-2">{plan.summary} <span className="tabular-nums text-ink-3">{Math.round(plan.confidence * 100)}% confidence</span></p>
            <ol className="flex flex-col gap-2">
              {plan.steps.map((step, index) => (
                <li key={step.id} className="flex gap-3 t-caption">
                  <span className="w-[16px] shrink-0 text-right tabular-nums text-ink-4">{index + 1}</span>
                  <span className="min-w-0 flex-1 text-ink">{step.title} <span className="t-mono-micro text-ink-3">{step.toolNames.join(", ")}</span></span>
                </li>
              ))}
            </ol>
          </div>
        ) : <Quiet>No plan yet.</Quiet>}
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel action={<span className="t-micro tabular-nums text-ink-3">{batches.length}</span>}>Proposed changes</SectionLabel>
        {batches.length ? batches.map((batch) => {
          const diffs = batchDiffs[batch.id] ?? [];
          const selected = selectedDiffByBatch[batch.id] ?? [];
          const validation = selectionValidation[batch.id];
          const previewEnabled = previewEnabledByBatch[batch.id] ?? true;
          return (
            <ObjectRow key={batch.id} className="gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="t-body-medium text-ink">{batch.summary}</span>
                  <span className="t-micro text-ink-3"><span className="t-mono-micro">{batch.stage}</span> · {batch.proposalIds.length} proposals</span>
                </div>
                <StatusPill tone={statusTone(batch.status)} className="capitalize">{batch.status}</StatusPill>
              </div>
              {validation && !validation.valid ? <p className="t-caption text-critical-text">{validation.blockedReason}</p> : null}
              {diffs.length > 0 ? (
                <ul className="flex flex-col gap-3">
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
                        <span className="block text-ink-3">
                          <span className="t-mono-micro">{diff.changeType}</span> · risk {diff.riskLevel} · {diff.affectedSubsystem}
                          {diff.dependencies.length ? <> · needs <span className="t-mono-micro">{diff.dependencies.join(", ")}</span></> : null}
                        </span>
                      </CheckRow>
                    </li>
                  ))}
                </ul>
              ) : <Quiet>Diff not loaded.</Quiet>}
              <div className="flex flex-wrap gap-2">
                <Button size="xs" variant="primary" onClick={() => applySelectionDecision(batch.id, "approve_selected")}>Approve selected</Button>
                <Button size="xs" variant="secondary" onClick={() => applySelectionDecision(batch.id, "approve_all")}>Approve all</Button>
                <Button size="xs" variant="destructive" onClick={() => applySelectionDecision(batch.id, "reject_all")}>Reject all</Button>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
                <Button size="xs" variant="ghost" onClick={() => activeRunId && loadBatchDiffs(activeRunId, batch.id)}>Load diff</Button>
                <Button size="xs" variant="ghost" aria-pressed={previewEnabled} onClick={async () => {
                  const next = !previewEnabled;
                  setPreviewEnabledByBatch((prev) => ({ ...prev, [batch.id]: next }));
                  if (activeRunId) await refreshPreview(activeRunId, batch.id, selected, next);
                }}>{previewEnabled ? "Hide preview" : "Show preview"}</Button>
                <Button size="xs" variant="ghost" onClick={() => activeRunId && refreshRegion(activeRunId, batch.id, diffs.filter((d) => selected.includes(d.id)).map((d) => d.proposalId))}>Highlight on canvas</Button>
              </div>
            </ObjectRow>
          );
        }) : <Quiet>No proposals yet.</Quiet>}
      </div>

      <div className="flex flex-col">
        <Disclosure title="Run activity" count={tools.length + proposals.length + events.length}>
          <Lines title="Tools" empty="No tool calls yet." rows={tools.map((tool) => ({ id: tool.id, text: <><span className="t-mono-micro text-ink">{tool.toolName}</span> · {tool.status}</> }))} />
          <Lines title="Actions" empty="No actions yet." rows={proposals.map((p) => ({ id: p.id, text: <><span className="t-mono-micro text-ink">{p.actionType}</span> · {p.status} · {p.riskClass}</> }))} />
          <Lines title="Plan revisions" empty="No revisions yet." rows={revisions.map((rev) => ({ id: rev.id, text: <><span className="tabular-nums text-ink">v{rev.version}</span> {rev.summary}{rev.critique ? `. Critique: ${rev.critique}` : ""}</> }))} />
          <Lines title="Specialist roles" empty="No role activity yet." rows={roles.map((role) => ({ id: role.id, text: <><span className="text-ink">{role.role}</span> at <span className="t-mono-micro">{role.stage}</span> · {role.summary}</> }))} />
          <Lines title="Sub-tasks" empty="No delegated sub-tasks yet." rows={subTasks.map((task) => ({ id: task.id, text: <><span className="t-mono-micro">{task.contextPack.subsystemId}</span> · <span className="text-ink">{task.title}</span> · {task.role} · {task.status}</> }))} />
          <Lines title="Skills" empty="No skill invocations yet." rows={skillInvocations.map((skill) => ({ id: skill.id, text: <><span className="t-mono-micro text-ink">{skill.skillId}</span> · {skill.status} · {skill.inputSummary}</> }))} />
          <Lines title="Orchestration" empty="No orchestration steps yet." rows={orchestrationSteps.map((step) => ({ id: step.id, text: <><span className="t-mono-micro">{step.stage}</span> · {step.decision} · {step.summary}</> }))} />
          <Lines title="Reconciliation" empty="No reconciliation records yet." rows={reconciliations.map((r) => ({ id: r.id, text: <>{r.decision} · {r.summary} <span className="tabular-nums">({r.inputTaskIds.length} tasks)</span></> }))} />
          <Lines title="Events" empty="No events yet." rows={events.slice(-16).map((e) => ({ id: e.id, text: <><span className="tabular-nums text-ink-4">{e.sequence}</span> <span className="t-mono-micro text-ink">{e.type}</span>{e.text ? ` · ${e.text.slice(0, 96)}` : ""}</> }))} />
        </Disclosure>

        <Disclosure title="Memory and learning" count={memoryEntries.length}>
          <div className="flex flex-col gap-3">
            <span className="t-caption-medium text-ink">Memory <span className="tabular-nums text-ink-3">{memoryEntries.length} loaded</span></span>
            {memoryEntries.slice(0, 6).map((entry) => <p key={entry.id} className="t-caption text-ink-3"><span className="t-mono-micro">{entry.type}</span> · <span className="text-ink">{entry.title}</span> · {entry.confidence}</p>)}
            <form
              className="flex items-center gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                await fetch("/api/agent/strategies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, name: strategyChoice }) });
                await refreshRunArtifacts(activeRunId);
              }}
            >
              <Input aria-label="Strategy" className="font-mono" value={strategyChoice} onChange={(e) => setStrategyChoice(e.target.value)} placeholder="strategy" />
              <Button size="md" variant="secondary" type="submit">Save strategy</Button>
            </form>
            {strategies.slice(0, 4).map((strategy) => <p key={strategy.id} className="t-caption text-ink-3"><span className="text-ink">{strategy.name}</span> · {strategy.status}</p>)}
          </div>
          <Lines title="Patterns" empty="No saved patterns." rows={patterns.slice(0, 5).map((pattern) => ({ id: pattern.id, text: <><span className="text-ink">{pattern.title}</span> · {pattern.intendedUse}</> }))} />
          <Lines title="Decisions" empty="No decisions recorded." rows={decisions.slice(0, 5).map((decision) => ({ id: decision.id, text: <>{decision.state} · <span className="text-ink">{decision.title}</span></> }))} />
          <Lines title="Evaluation" empty="No evaluations yet." rows={evaluations.slice(0, 6).map((row) => ({ id: row.id, text: <><span className="t-mono-micro">{row.scope}:{row.type}</span> · <span className="tabular-nums text-ink">{Math.round(row.score.value * 100)}%</span> · {row.outcome}</> }))} />
          <Lines title="Strategy results" empty="No strategy results yet." rows={strategyPerformance.map((row) => ({ id: row.id, text: <><span className="text-ink">{row.strategyName}</span> · <span className="tabular-nums">score {Math.round(row.overallScore * 100)} · accepted {Math.round(row.acceptanceRate * 100)}% · friction {Math.round(row.reviewFriction * 100)}%</span></> }))} />
          <Lines title="Skill results" empty="No skill results yet." rows={skillPerformance.map((row) => ({ id: row.id, text: <><span className="t-mono-micro text-ink">{row.skillId}</span> ({row.role}) · <span className="tabular-nums">score {Math.round(row.overallScore * 100)} · success {Math.round(row.successRate * 100)}%</span></> }))} />
          <Lines
            title={`Pattern lifecycle · ${patternLifecycle.promoted.length} promoted, ${patternLifecycle.demoted.length} demoted`}
            empty="No promotions or demotions."
            rows={[
              ...patternLifecycle.promoted.slice(0, 4).map((row) => ({ id: row.id, text: <><span className="text-positive-text">Promoted</span> <span className="t-mono-micro">{row.patternArtifactId}</span> · {row.reason}</> })),
              ...patternLifecycle.demoted.slice(0, 4).map((row) => ({ id: row.id, text: <><span className="text-critical-text">Demoted</span> <span className="t-mono-micro">{row.patternArtifactId}</span> · {row.reason}</> }))
            ]}
          />
          <Lines title="Learning" empty="No learning artifacts yet." rows={learningArtifacts.slice(0, 6).map((row) => ({ id: row.id, text: <><span className="t-mono-micro">{row.type}</span> · <span className="text-ink">{row.title}</span> · {row.confidence}</> }))} />
        </Disclosure>

        <Disclosure title="Review and handoff" count={collaboration.reviewers.length + collaboration.comments.length}>
          <div className="flex flex-col gap-2">
            <span className="t-caption-medium text-ink">Run policy</span>
            {policySnapshot ? (
              <div className="flex flex-col gap-1 t-caption text-ink-3">
                <p>Risk <span className="text-ink">{policySnapshot.risk.posture}</span> · auto-apply <span className="text-ink">{policySnapshot.risk.safeAutoApplyEnabled ? "on" : "off"}</span></p>
                <p>Approval <span className="text-ink">{policySnapshot.approval.strictness}</span> · max duration <span className="tabular-nums text-ink">{Math.round(policySnapshot.runtime.maxRunDurationMs / 1000)}s</span></p>
                <p>Escalations <span className="tabular-nums text-ink">{policyEvents.escalations.length}</span> · provider calls <span className="tabular-nums text-ink">{policyEvents.usage?.providerCalls ?? 0}</span></p>
              </div>
            ) : <Quiet>No policy snapshot yet.</Quiet>}
          </div>
          <Lines
            title={`Reviewers · ${collaboration.reviewers.length} active, ${collaboration.visibility.length} watching`}
            empty="Nobody else is reviewing."
            rows={collaboration.reviewers.map((row) => ({ id: row.id, text: <><span className="t-mono-micro text-ink">{row.userId}</span> · {row.role} · {row.status}</> }))}
          />
          <div className="flex flex-col gap-3">
            <span className="t-caption-medium text-ink">Comment on the first batch</span>
            <form
              className="flex items-center gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!activeRunId) return;
                const firstBatch = batches[0];
                if (!firstBatch) return;
                await fetch("/api/agent/review-comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, targetType: "proposal_batch", targetId: firstBatch.id, body: commentBody }) });
                await refreshRunArtifacts(activeRunId);
              }}
            >
              <Input aria-label="Batch comment" value={commentBody} onChange={(e) => setCommentBody(e.target.value)} />
              <Button size="md" variant="secondary" type="submit" disabled={!activeRunId || !batches[0]}>Comment</Button>
            </form>
            {collaboration.comments.slice(0, 8).map((c) => <p key={c.id} className="t-caption text-ink-3"><span className="t-mono-micro">{c.authorId}</span> on <span className="t-mono-micro">{c.targetType}:{c.targetId}</span> · <span className="text-ink">{c.body}</span></p>)}
          </div>
          <div className="flex flex-col gap-3">
            <span className="t-caption-medium text-ink">Approval feedback</span>
            {collaboration.approvalParticipants.slice(0, 8).map((row) => <p key={row.id} className="t-caption text-ink-3"><span className="t-mono-micro">{row.approvalRequestId}</span> · {row.actorId} · {row.recommendation}</p>)}
            {approvals[0] ? <div><Button size="xs" variant="secondary" onClick={async () => {
              if (!activeRunId || !approvals[0]) return;
              await fetch("/api/agent/approval-feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, approvalRequestId: approvals[0].id, recommendation: "needs_revision", note: "Please split risky batch.", decision: "object" }) });
              await refreshRunArtifacts(activeRunId);
            }}>Object to the first approval</Button></div> : <Quiet>No approvals to weigh in on.</Quiet>}
          </div>
          <div className="flex flex-col gap-3">
            <span className="t-caption-medium text-ink">Revision requests</span>
            {collaboration.revisions.slice(0, 6).map((row) => <p key={row.id} className="t-caption text-ink-3"><span className="t-mono-micro">{row.targetType}:{row.targetId}</span> · {row.status} · <span className="text-ink">{row.rationale}</span></p>)}
            {batches[0] ? <div><Button size="xs" variant="secondary" onClick={async () => {
              if (!activeRunId || !batches[0]) return;
              await fetch("/api/agent/revision-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, targetType: "proposal_batch", targetId: batches[0].id, rationale: "Split batch for clearer approval scope.", requestedOutcome: "safe subset first" }) });
              await refreshRunArtifacts(activeRunId);
            }}>Ask for a revision</Button></div> : <Quiet>No batch to revise yet.</Quiet>}
          </div>
          <div className="flex flex-col gap-3">
            <span className="t-caption-medium text-ink">Hand off this run</span>
            <form
              className="flex items-center gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!activeRunId) return;
                await fetch("/api/agent/handoffs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, toUserId: handoffTo, note: "Please finish approval and review open threads." }) });
                await refreshRunArtifacts(activeRunId);
              }}
            >
              <Input aria-label="Hand off to user id" className="font-mono" value={handoffTo} onChange={(e) => setHandoffTo(e.target.value)} placeholder="User id" />
              <Button size="md" variant="secondary" type="submit" disabled={!activeRunId}>Hand off</Button>
            </form>
            {collaboration.handoffs.slice(0, 6).map((row) => <p key={row.id} className="t-caption text-ink-3"><span className="t-mono-micro">{row.fromUserId}</span> → <span className="t-mono-micro">{row.toUserId}</span> · {row.status} · {row.stage}</p>)}
          </div>
        </Disclosure>
      </div>
    </div>
  );
}

/** A disclosure group: secondary run detail stays one click away, in place. */
function Disclosure({ title, count, children }: { title: string; count?: number; children: ReactNode }): ReactNode {
  return (
    <details className="group border-t border-hairline">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-6 py-4 outline-none focus-ring [&::-webkit-details-marker]:hidden">
        <span className="t-label-caps text-ink">{title}</span>
        {count !== undefined ? <span className="t-micro tabular-nums text-ink-3">{count}</span> : null}
        <ChevronDown aria-hidden="true" size={14} className="ml-auto text-ink-3 transition-transform duration-[var(--dur-2)] group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-6 pb-6">{children}</div>
    </details>
  );
}

function Lines({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; text: ReactNode }> }): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <span className="t-caption-medium text-ink">{title}</span>
      {rows.length === 0 ? <Quiet>{empty}</Quiet> : rows.map((row) => <p key={row.id} className="t-caption text-ink-3">{row.text}</p>)}
    </div>
  );
}
