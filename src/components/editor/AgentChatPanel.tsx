"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Panel } from "@/components/ui";

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

  return (
    <Panel title="Builder Agent">
      <div className="agent-panel-shell">
        <div className="agent-status-row">
          <Badge tone="neutral">Attached · {systemName}</Badge>
          <Badge tone={runStatus === "failed" ? "warn" : "good"}>Run · {runStatus}</Badge>
          <Badge tone="neutral">Stage · {stages.at(-1)?.stage ?? "idle"}</Badge>
        </div>
        <div className="nav-inline">{sessions.map((s) => <Button key={s.id} variant="subtle" onClick={() => setSessionId(s.id)}>{s.id === sessionId ? `• ${s.title}` : s.title}</Button>)}</div>
        <div className="agent-prompt-row">
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the agent to plan or refine this system" />
          <Button onClick={runPrompt} disabled={runStatus === "tooling" || runStatus === "planning" || runStatus === "applying"}>Run</Button>
        </div>
      </div>

      <Card><h4>Current plan</h4>{plan ? <><p>{plan.summary} ({Math.round(plan.confidence * 100)}% confidence)</p><ul>{plan.steps.map((step) => <li key={step.id}>{step.title} · tools: {step.toolNames.join(", ")}</li>)}</ul></> : <p>No plan yet.</p>}</Card>
      <details className="agent-advanced-block"><summary>Advanced run telemetry</summary>
      <Card><h4>Plan revisions</h4>{revisions.length ? revisions.map((rev) => <p key={rev.id}>v{rev.version}: {rev.summary}{rev.critique ? ` · critique: ${rev.critique}` : ""}</p>) : <p>No revisions yet.</p>}</Card>
      <Card><h4>Specialist roles</h4>{roles.length ? roles.map((role) => <p key={role.id}>{role.role} @ {role.stage} · {role.summary}</p>) : <p>No role activity yet.</p>}</Card>
      <Card><h4>Subsystem sub-tasks</h4>{subTasks.length ? subTasks.map((task) => <p key={task.id}>{task.contextPack.subsystemId} · {task.title} · {task.role} · {task.status}</p>) : <p>No delegated sub-tasks yet.</p>}</Card>
      <Card><h4>Active skills</h4>{skillInvocations.length ? skillInvocations.map((skill) => <p key={skill.id}>{skill.skillId} · {skill.status} · {skill.inputSummary}</p>) : <p>No skill invocations yet.</p>}</Card>
      <Card><h4>Orchestration</h4>{orchestrationSteps.length ? orchestrationSteps.map((step) => <p key={step.id}>{step.stage} · {step.decision} · {step.summary}</p>) : <p>No orchestration steps yet.</p>}</Card>
      <Card><h4>Reconciliation</h4>{reconciliations.length ? reconciliations.map((r) => <p key={r.id}>{r.decision} · {r.summary} ({r.inputTaskIds.length} tasks)</p>) : <p>No reconciliation records yet.</p>}</Card>
      <Card>
        <h4>Memory continuity</h4>
        <p>Loaded memories: {memoryEntries.length}</p>
        {memoryEntries.slice(0, 6).map((entry) => <p key={entry.id}>{entry.type} · {entry.title} · {entry.confidence}</p>)}
        <div className="nav-inline">
          <Input value={strategyChoice} onChange={(e) => setStrategyChoice(e.target.value)} placeholder="strategy" />
          <Button onClick={async () => {
            await fetch("/api/agent/strategies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, name: strategyChoice }) });
            await refreshRunArtifacts(activeRunId);
          }}>Save strategy</Button>
        </div>
        {strategies.slice(0, 4).map((strategy) => <p key={strategy.id}>{strategy.name} · {strategy.status}</p>)}
      </Card>
      <Card><h4>Pattern reuse</h4>{patterns.length ? patterns.slice(0, 5).map((pattern) => <p key={pattern.id}>{pattern.title} · {pattern.intendedUse}</p>) : <p>No saved patterns.</p>}</Card>
      <Card><h4>Decision memory</h4>{decisions.length ? decisions.slice(0, 5).map((decision) => <p key={decision.id}>{decision.state} · {decision.title}</p>) : <p>No decisions recorded.</p>}</Card>
      <Card><h4>Run evaluation</h4>{evaluations.length ? evaluations.slice(0, 6).map((row) => <p key={row.id}>{row.scope}:{row.type} · {Math.round(row.score.value * 100)}% · {row.outcome}</p>) : <p>No evaluation artifacts yet.</p>}</Card>
      <Card><h4>Strategy effectiveness</h4>{strategyPerformance.length ? strategyPerformance.map((row) => <p key={row.id}>{row.strategyName} · score {Math.round(row.overallScore * 100)} · accept {Math.round(row.acceptanceRate * 100)}% · friction {Math.round(row.reviewFriction * 100)}%</p>) : <p>No strategy performance yet.</p>}</Card>
      <Card><h4>Skill effectiveness</h4>{skillPerformance.length ? skillPerformance.map((row) => <p key={row.id}>{row.skillId} ({row.role}) · score {Math.round(row.overallScore * 100)} · success {Math.round(row.successRate * 100)}%</p>) : <p>No skill performance yet.</p>}</Card>
      <Card><h4>Pattern lifecycle</h4><p>Promoted: {patternLifecycle.promoted.length} · Demoted: {patternLifecycle.demoted.length}</p>{patternLifecycle.promoted.slice(0, 4).map((row) => <p key={row.id}>↑ {row.patternArtifactId} · {row.reason}</p>)}{patternLifecycle.demoted.slice(0, 4).map((row) => <p key={row.id}>↓ {row.patternArtifactId} · {row.reason}</p>)}</Card>
      <Card><h4>Learning artifacts</h4>{learningArtifacts.length ? learningArtifacts.slice(0, 6).map((row) => <p key={row.id}>{row.type} · {row.title} · {row.confidence}</p>) : <p>No learning artifacts yet.</p>}</Card>
      <Card><h4>Run policy</h4>{policySnapshot ? <><p>Risk: {policySnapshot.risk.posture} · auto-apply: {String(policySnapshot.risk.safeAutoApplyEnabled)}</p><p>Approval: {policySnapshot.approval.strictness} · max duration: {Math.round(policySnapshot.runtime.maxRunDurationMs / 1000)}s</p><p>Escalations: {policyEvents.escalations.length} · provider calls: {policyEvents.usage?.providerCalls ?? 0}</p></> : <p>No policy snapshot yet.</p>}</Card>
      <Card>
        <h4>Collaborative run context</h4>
        <p>Active reviewers: {collaboration.reviewers.length}</p>
        {collaboration.reviewers.map((row) => <p key={row.id}>{row.userId} · {row.role} · {row.status}</p>)}
        <p>Shared viewers: {collaboration.visibility.length}</p>
      </Card>
      <Card>
        <h4>Batch/diff review comments</h4>
        <div className="nav-inline">
          <Input value={commentBody} onChange={(e) => setCommentBody(e.target.value)} />
          <Button onClick={async () => {
            if (!activeRunId) return;
            const firstBatch = batches[0];
            if (!firstBatch) return;
            await fetch("/api/agent/review-comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, targetType: "proposal_batch", targetId: firstBatch.id, body: commentBody }) });
            await refreshRunArtifacts(activeRunId);
          }}>Comment on batch</Button>
        </div>
        {collaboration.comments.slice(0, 8).map((c) => <p key={c.id}>{c.targetType}:{c.targetId} · {c.authorId} · {c.body}</p>)}
      </Card>
      <Card>
        <h4>Approval collaboration</h4>
        {collaboration.approvalParticipants.slice(0, 8).map((row) => <p key={row.id}>{row.approvalRequestId} · {row.actorId} · {row.recommendation}</p>)}
        {approvals[0] ? <Button onClick={async () => {
          if (!activeRunId || !approvals[0]) return;
          await fetch("/api/agent/approval-feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, approvalRequestId: approvals[0].id, recommendation: "needs_revision", note: "Please split risky batch.", decision: "object" }) });
          await refreshRunArtifacts(activeRunId);
        }}>Add objection</Button> : null}
      </Card>
      <Card>
        <h4>Revision requests</h4>
        {collaboration.revisions.slice(0, 6).map((row) => <p key={row.id}>{row.targetType}:{row.targetId} · {row.status} · {row.rationale}</p>)}
        {batches[0] ? <Button onClick={async () => {
          if (!activeRunId || !batches[0]) return;
          await fetch("/api/agent/revision-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, targetType: "proposal_batch", targetId: batches[0].id, rationale: "Split batch for clearer approval scope.", requestedOutcome: "safe subset first" }) });
          await refreshRunArtifacts(activeRunId);
        }}>Request revision</Button> : null}
      </Card>
      <Card>
        <h4>Run handoff</h4>
        <div className="nav-inline">
          <Input value={handoffTo} onChange={(e) => setHandoffTo(e.target.value)} placeholder="to user id" />
          <Button onClick={async () => {
            if (!activeRunId) return;
            await fetch("/api/agent/handoffs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: activeRunId, systemId, toUserId: handoffTo, note: "Please finish approval and review open threads." }) });
            await refreshRunArtifacts(activeRunId);
          }}>Create handoff</Button>
        </div>
        {collaboration.handoffs.slice(0, 6).map((row) => <p key={row.id}>{row.fromUserId} → {row.toUserId} · {row.status} · {row.stage}</p>)}
      </Card>
      <Card><h4>Tool activity</h4>{tools.length ? tools.map((tool) => <p key={tool.id}>{tool.toolName} · {tool.status}</p>) : <p>No tool calls yet.</p>}</Card>
      </details>
      <Card>
        <h4>Proposal batches</h4>
        {batches.length ? batches.map((batch) => {
          const diffs = batchDiffs[batch.id] ?? [];
          const selected = selectedDiffByBatch[batch.id] ?? [];
          const validation = selectionValidation[batch.id];
          const previewEnabled = previewEnabledByBatch[batch.id] ?? true;
          return (
            <div key={batch.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
              <p>{batch.stage} · {batch.summary} · {batch.status} ({batch.proposalIds.length} proposals)</p>
              <div className="nav-inline">
                <Button onClick={() => activeRunId && loadBatchDiffs(activeRunId, batch.id)}>Load diff</Button>
                <Button onClick={async () => {
                  const next = !previewEnabled;
                  setPreviewEnabledByBatch((prev) => ({ ...prev, [batch.id]: next }));
                  if (activeRunId) await refreshPreview(activeRunId, batch.id, selected, next);
                }}>{previewEnabled ? "Hide preview" : "Show preview"}</Button>
                <Button onClick={() => activeRunId && refreshRegion(activeRunId, batch.id, diffs.filter((d) => selected.includes(d.id)).map((d) => d.proposalId))}>Highlight region</Button>
                <Button onClick={() => applySelectionDecision(batch.id, "approve_all")}>Approve all</Button>
                <Button onClick={() => applySelectionDecision(batch.id, "approve_selected")}>Approve selected</Button>
                <Button onClick={() => applySelectionDecision(batch.id, "reject_all")}>Reject all</Button>
              </div>
              {validation && !validation.valid ? <p style={{ color: "#b64848" }}>{validation.blockedReason}</p> : null}
              {diffs.length > 0 ? (
                <div className="validation-list">
                  {diffs.map((diff) => (
                    <label key={diff.id} style={{ display: "block", marginBottom: 6, opacity: diff.canSelectIndividually ? 1 : 0.78 }}>
                      <input
                        type="checkbox"
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
                      />{" "}
                      {diff.summary} · {diff.changeType} · risk {diff.riskLevel} · region {diff.affectedSubsystem}
                      {diff.dependencies.length ? ` · depends on ${diff.dependencies.join(", ")}` : ""}
                    </label>
                  ))}
                </div>
              ) : <p>No diff items loaded.</p>}
            </div>
          );
        }) : <p>No batches yet.</p>}
      </Card>
      <Card>
        <h4>Pending approvals</h4>
        {approvals.filter((a) => a.status === "pending").map((approval) => (
          <div key={approval.id} style={{ marginBottom: 8 }}>
            <p>{approval.reason}</p>
            <div className="nav-inline"><Button onClick={() => decideApproval(approval.id, "approved")}>Approve</Button><Button onClick={() => decideApproval(approval.id, "rejected")}>Reject</Button></div>
          </div>
        ))}
        {approvals.filter((a) => a.status === "pending").length === 0 && <p>No pending approvals.</p>}
      </Card>
      <Card><h4>Action timeline</h4>{proposals.length ? proposals.map((p) => <p key={p.id}>{p.actionType} · {p.status} · {p.riskClass}</p>) : <p>No actions yet.</p>}</Card>
      <Card><h4>Assistant stream</h4><p>{assistantText || "No output yet."}</p></Card>
      <Card><h4>Run events</h4><div className="validation-list">{events.slice(-16).map((e) => <p key={e.id}>{e.sequence}. {e.type}{e.text ? ` · ${e.text.slice(0, 96)}` : ""}</p>)}</div></Card>
    </Panel>
  );
}
