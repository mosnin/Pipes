import type { Plan, Role } from "@/domain/pipes_schema_v1/schema";
import type { AgentRun, AgentSession, ApprovalRequest, RunEvent, RunMessage, RunPlan, RunStatus, ToolCallRecord } from "@/domain/agent_builder/model";
import type { AppliedGraphActionRecord, GraphActionProposal, GraphActionProposalStatus } from "@/domain/agent_builder/actions";
import type { PlanRevision, ProposalBatch, RoleActivity, StageRecord } from "@/domain/agent_builder/staged";
import type { OrchestrationStep, ReconciliationRecord, SkillInvocation, SubAgentResult, SubAgentTask } from "@/domain/agent_builder/sub_agents";

export type AppContext = {
  userId: string;
  workspaceId: string;
  role: Role;
  plan: Plan;
  actorType: "user" | "agent";
  actorId: string;
  capabilities?: string[];
  systemScope?: string;
};
export type BillingStatus = "active" | "canceled" | "past_due" | "trialing";

export type ProvisionIdentity = { externalId: string; email: string; name: string };

export type SystemRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type NodeRecord = { id: string; systemId: string; type: string; title: string; description?: string; position: { x: number; y: number }; portIds: string[] };
export type PipeRecord = { id: string; systemId: string; fromPortId: string; toPortId: string; fromNodeId?: string; toNodeId?: string };
export type CommentRecord = { id: string; systemId: string; authorId: string; body: string; nodeId?: string; createdAt: string };
export type VersionRecord = { id: string; systemId: string; name: string; authorId: string; createdAt: string; snapshot: string };
export type PresenceRecord = { id: string; systemId: string; userId: string; name: string; selectedNodeId?: string; editingTarget?: string; cursor?: { x: number; y: number }; updatedAt: string };

export type SystemBundle = {
  system: SystemRecord;
  nodes: NodeRecord[];
  pipes: PipeRecord[];
  comments: CommentRecord[];
  versions: VersionRecord[];
  presence: PresenceRecord[];
};

export interface UsersRepository {
  provision(identity: ProvisionIdentity): Promise<AppContext>;
  findByEmail(email: string): Promise<{ id: string; email: string; name: string } | null>;
}

export interface WorkspacesRepository {
  getPlan(workspaceId: string): Promise<Plan>;
}

export interface MembershipsRepository {
  add(workspaceId: string, userId: string, role: Role): Promise<void>;
  list(workspaceId: string): Promise<Array<{ userId: string; role: Role }>>;
  updateRole(workspaceId: string, userId: string, role: Role): Promise<void>;
}

export interface SystemsRepository {
  list(workspaceId: string): Promise<SystemRecord[]>;
  create(input: { workspaceId: string; userId: string; name: string; description: string }): Promise<string>;
  getBundle(systemId: string): Promise<SystemBundle>;
  archive(systemId: string): Promise<void>;
  restore(systemId: string): Promise<void>;
}

export interface GraphRepository {
  addNode(input: { systemId: string; type: string; title: string; description?: string; x: number; y: number }): Promise<string>;
  updateNode(input: { nodeId: string; title?: string; description?: string; position?: { x: number; y: number } }): Promise<void>;
  deleteNode(nodeId: string): Promise<void>;
  addPipe(input: { systemId: string; fromNodeId: string; toNodeId: string }): Promise<string>;
  deletePipe(pipeId: string): Promise<void>;
}

export interface CommentsRepository {
  add(input: { systemId: string; authorId: string; body: string; nodeId?: string }): Promise<void>;
}

export interface VersionsRepository {
  list(systemId: string): Promise<VersionRecord[]>;
  add(input: { systemId: string; authorId: string; name: string; snapshot: string }): Promise<void>;
  get(systemId: string, versionId: string): Promise<VersionRecord | null>;
  restoreSnapshot(systemId: string, snapshot: string): Promise<void>;
}

export interface InvitesRepository {
  add(input: { workspaceId: string; email: string; role: Role; token: string; invitedBy: string; expiresAt: string }): Promise<void>;
  list(workspaceId: string): Promise<Array<{ token: string; email: string; role: Role; status: "pending" | "accepted" | "canceled" | "expired"; expiresAt: string }>>;
  getByToken(token: string): Promise<{ workspaceId: string; token: string; email: string; role: Role; status: "pending" | "accepted" | "canceled" | "expired"; expiresAt: string } | null>;
  accept(token: string, userId: string): Promise<void>;
  cancel(token: string): Promise<void>;
}

export interface PresenceRepository {
  upsert(input: { systemId: string; userId: string; sessionId: string; selectedNodeId?: string; editingTarget?: string; cursor?: { x: number; y: number } }): Promise<void>;
  list(systemId: string): Promise<PresenceRecord[]>;
}

export interface EntitlementsRepository {
  getPlan(workspaceId: string): Promise<Plan>;
  getPlanState(workspaceId: string): Promise<{ plan: Plan; status: BillingStatus }>;
  upsertPlanState(input: { workspaceId: string; plan: Plan; status: BillingStatus; externalCustomerId?: string; externalSubscriptionId?: string }): Promise<void>;
}

export type FeedbackStatus = "new" | "reviewing" | "closed";
export type FeedbackCategory = "bug" | "ux" | "feature_request" | "reliability" | "billing" | "other";
export type FeedbackSeverity = "low" | "medium" | "high";

export interface FeedbackRepository {
  create(input: {
    workspaceId: string;
    createdBy: string;
    actorType: "user" | "agent";
    actorId: string;
    category: FeedbackCategory;
    severity: FeedbackSeverity;
    summary: string;
    details: string;
    page: string;
    systemId?: string;
    userEmail?: string;
  }): Promise<{ id: string }>;
  list(workspaceId: string, filter?: { status?: FeedbackStatus; category?: FeedbackCategory; limit?: number }): Promise<Array<{
    id: string;
    workspaceId: string;
    createdBy: string;
    actorType: "user" | "agent";
    actorId: string;
    category: FeedbackCategory;
    severity: FeedbackSeverity;
    summary: string;
    details: string;
    page: string;
    systemId?: string;
    userEmail?: string;
    status: FeedbackStatus;
    createdAt: string;
    updatedAt: string;
  }>>;
  updateStatus(input: { workspaceId: string; id: string; status: FeedbackStatus; updatedBy: string }): Promise<void>;
}

export type RepositorySet = {
  users: UsersRepository;
  workspaces: WorkspacesRepository;
  memberships: MembershipsRepository;
  systems: SystemsRepository;
  graph: GraphRepository;
  comments: CommentsRepository;
  versions: VersionsRepository;
  invites: InvitesRepository;
  presence: PresenceRepository;
  entitlements: EntitlementsRepository;
  feedback: FeedbackRepository;
  agentTokens: {
    create(input: { workspaceId: string; name: string; capabilities: string[]; systemId?: string; tokenHash: string; tokenPreview: string; createdByUserId: string }): Promise<{ id: string }>;
    list(workspaceId: string): Promise<Array<{ id: string; name: string; capabilities: string[]; systemId?: string; tokenPreview: string; createdByUserId: string; createdAt: string; lastUsedAt?: string; revokedAt?: string }>>;
    revoke(id: string): Promise<void>;
    findByHash(tokenHash: string): Promise<{ id: string; workspaceId: string; name: string; capabilities: string[]; systemId?: string; createdByUserId: string; revokedAt?: string } | null>;
    touchLastUsed(id: string): Promise<void>;
  };
  audits: {
    add(input: { actorType: "user" | "agent"; actorId: string; workspaceId: string; action: string; targetType: string; targetId?: string; outcome: "success" | "failure"; metadata?: string; systemId?: string }): Promise<void>;
    list(workspaceId: string, filter?: { actorType?: "user" | "agent"; actorId?: string; actionPrefix?: string; systemId?: string; transport?: string; outcome?: "success" | "failure"; since?: string; until?: string; limit?: number }): Promise<Array<{ id: string; actorType: string; actorId: string; action: string; targetType: string; targetId?: string; outcome: string; createdAt: string; systemId?: string; metadata?: string }>>;
  };
  idempotency: {
    get(input: { workspaceId: string; actorId: string; route: string; key: string }): Promise<{ requestHash: string; responseJson: string; statusCode: number } | null>;
    put(input: { workspaceId: string; actorId: string; route: string; key: string; requestHash: string; responseJson: string; statusCode: number }): Promise<void>;
  };
  rateLimits: {
    consume(input: { bucket: string; windowSeconds: number; limit: number; now: string }): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }>;
  };
  agentBuilder: {
    createSession(input: { workspaceId: string; systemId?: string; title: string; createdBy: string }): Promise<AgentSession>;
    listSessions(input: { workspaceId: string; systemId?: string }): Promise<AgentSession[]>;
    createRun(input: { sessionId: string; workspaceId: string; systemId?: string; userMessageId: string }): Promise<AgentRun>;
    updateRun(input: { runId: string; status: RunStatus; startedAt?: string; endedAt?: string; error?: string }): Promise<void>;
    getRun(runId: string): Promise<AgentRun | null>;
    addMessage(input: { sessionId: string; runId?: string; workspaceId: string; systemId?: string; role: "user" | "assistant" | "system"; body: string }): Promise<RunMessage>;
    listMessages(input: { sessionId: string }): Promise<RunMessage[]>;
    addEvent(input: Omit<RunEvent, "id">): Promise<RunEvent>;
    listRunEvents(input: { sessionId?: string; runId?: string }): Promise<RunEvent[]>;
    addProposal(input: Omit<GraphActionProposal, "id">): Promise<GraphActionProposal>;
    listProposals(input: { runId?: string; systemId?: string; status?: GraphActionProposalStatus }): Promise<GraphActionProposal[]>;
    updateProposal(input: { proposalId: string; status: GraphActionProposalStatus; appliedAt?: string; reviewDecision?: GraphActionProposal["reviewDecision"]; error?: string }): Promise<void>;
    getProposal(proposalId: string): Promise<GraphActionProposal | null>;
    addAppliedAction(input: Omit<AppliedGraphActionRecord, "id">): Promise<AppliedGraphActionRecord>;
    listAppliedActions(input: { runId?: string; systemId?: string }): Promise<AppliedGraphActionRecord[]>;
    upsertPlan(input: Omit<RunPlan, "id" | "createdAt" | "updatedAt"> & { planId?: string }): Promise<RunPlan>;
    getPlan(runId: string): Promise<RunPlan | null>;
    addToolCall(input: Omit<ToolCallRecord, "id">): Promise<ToolCallRecord>;
    listToolCalls(input: { runId: string }): Promise<ToolCallRecord[]>;
    addApprovalRequest(input: Omit<ApprovalRequest, "id">): Promise<ApprovalRequest>;
    listApprovalRequests(input: { runId?: string; systemId?: string; status?: ApprovalRequest["status"] }): Promise<ApprovalRequest[]>;
    getApprovalRequest(id: string): Promise<ApprovalRequest | null>;
    updateApprovalRequest(input: { requestId: string; status: ApprovalRequest["status"]; decidedAt?: string; decidedBy?: string; decisionNote?: string }): Promise<void>;
    addStageRecord(input: Omit<StageRecord, "id">): Promise<StageRecord>;
    listStageRecords(input: { runId: string }): Promise<StageRecord[]>;
    addPlanRevision(input: Omit<PlanRevision, "id">): Promise<PlanRevision>;
    listPlanRevisions(input: { runId: string }): Promise<PlanRevision[]>;
    addRoleActivity(input: Omit<RoleActivity, "id">): Promise<RoleActivity>;
    listRoleActivities(input: { runId: string }): Promise<RoleActivity[]>;
    addProposalBatch(input: Omit<ProposalBatch, "id">): Promise<ProposalBatch>;
    listProposalBatches(input: { runId: string }): Promise<ProposalBatch[]>;
    addSubAgentTask(input: Omit<SubAgentTask, "id">): Promise<SubAgentTask>;
    updateSubAgentTask(input: { taskId: string; status: SubAgentTask["status"]; startedAt?: string; completedAt?: string; error?: string }): Promise<void>;
    listSubAgentTasks(input: { runId: string }): Promise<SubAgentTask[]>;
    addSubAgentResult(input: Omit<SubAgentResult, "id">): Promise<SubAgentResult>;
    listSubAgentResults(input: { runId: string }): Promise<SubAgentResult[]>;
    addSkillInvocation(input: Omit<SkillInvocation, "id">): Promise<SkillInvocation>;
    listSkillInvocations(input: { runId: string }): Promise<SkillInvocation[]>;
    addOrchestrationStep(input: Omit<OrchestrationStep, "id">): Promise<OrchestrationStep>;
    listOrchestrationSteps(input: { runId: string }): Promise<OrchestrationStep[]>;
    addReconciliationRecord(input: Omit<ReconciliationRecord, "id">): Promise<ReconciliationRecord>;
    listReconciliationRecords(input: { runId: string }): Promise<ReconciliationRecord[]>;
  };
};
