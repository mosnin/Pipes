import fs from "node:fs";
import path from "node:path";
import { sampleData } from "@/lib/convex/mockData";
import type { Node, Pipe, Plan, Role } from "@/domain/pipes_schema_v1/schema";
import type { FeedbackCategory, FeedbackSeverity, FeedbackStatus } from "@/lib/repositories/contracts";
import type { AgentRun, AgentSession, ApprovalRequest, RunEvent, RunMessage, RunPlan, ToolCallRecord } from "@/domain/agent_builder/model";
import type { AppliedGraphActionRecord, GraphActionProposal } from "@/domain/agent_builder/actions";
import type { PlanRevision, ProposalBatch, RoleActivity, StageRecord } from "@/domain/agent_builder/staged";
import type { OrchestrationStep, ReconciliationRecord, SkillInvocation, SubAgentResult, SubAgentTask } from "@/domain/agent_builder/sub_agents";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

type Membership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  createdAt: string;
};

type PersistedSystem = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  isFavorite?: boolean;
};

type CommentRecord = {
  id: string;
  systemId: string;
  authorId: string;
  body: string;
  nodeId?: string;
  createdAt: string;
};

type VersionRecord = {
  id: string;
  systemId: string;
  name: string;
  authorId: string;
  createdAt: string;
  snapshot: string;
};

type PresenceRecord = {
  id: string;
  systemId: string;
  userId: string;
  name: string;
  selectedNodeId?: string;
  updatedAt: string;
};

type DbShape = {
  users: Array<{ id: string; externalId: string; email: string; name: string; createdAt: string }>;
  workspaces: Array<{ id: string; ownerId: string; name: string; slug: string; plan: Plan; createdAt: string }>;
  memberships: Membership[];
  systems: PersistedSystem[];
  nodes: Node[];
  pipes: Pipe[];
  comments: CommentRecord[];
  versions: VersionRecord[];
  invites: Array<{ id: string; workspaceId: string; email: string; role: Role; token: string; status: "pending" | "accepted" | "canceled" | "expired"; createdAt: string; expiresAt: string; invitedBy?: string; acceptedBy?: string; acceptedAt?: string; canceledAt?: string }>;
  presence: PresenceRecord[];
  planState: Array<{ workspaceId: string; plan: Plan; status: "active" | "canceled" | "past_due" | "trialing"; updatedAt: string; externalCustomerId?: string; externalSubscriptionId?: string }>;
  agentTokens: Array<{ id: string; workspaceId: string; name: string; capabilities: string[]; systemId?: string; tokenHash: string; tokenPreview: string; createdByUserId: string; createdAt: string; lastUsedAt?: string; revokedAt?: string }>;
  audits: Array<{ id: string; actorType: "user" | "agent"; actorId: string; workspaceId: string; action: string; targetType: string; targetId?: string; outcome: "success" | "failure"; metadata?: string; systemId?: string; createdAt: string }>;
  idempotency: Array<{ id: string; workspaceId: string; actorId: string; route: string; key: string; requestHash: string; responseJson: string; statusCode: number; createdAt: string }>;
  rateLimits: Array<{ id: string; bucket: string; windowStart: string; count: number; updatedAt: string }>;
  feedback: Array<{ id: string; workspaceId: string; createdBy: string; actorType: "user" | "agent"; actorId: string; category: FeedbackCategory; severity: FeedbackSeverity; summary: string; details: string; page: string; systemId?: string; userEmail?: string; status: FeedbackStatus; createdAt: string; updatedAt: string }>;
  agentSessions: AgentSession[];
  agentRuns: AgentRun[];
  runMessages: RunMessage[];
  runEvents: RunEvent[];
  graphActionProposals: GraphActionProposal[];
  appliedGraphActions: AppliedGraphActionRecord[];
  runPlans: RunPlan[];
  toolCalls: ToolCallRecord[];
  approvalRequests: ApprovalRequest[];
  stageRecords: StageRecord[];
  planRevisions: PlanRevision[];
  roleActivities: RoleActivity[];
  proposalBatches: ProposalBatch[];
  subAgentTasks: SubAgentTask[];
  subAgentResults: SubAgentResult[];
  skillInvocations: SkillInvocation[];
  orchestrationSteps: OrchestrationStep[];
  reconciliationRecords: ReconciliationRecord[];
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function seed(): DbShape {
  const system = sampleData.systems[0];
  return {
    users: [{ id: "usr_1", externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera", createdAt: new Date().toISOString() }],
    workspaces: [{ id: "wks_1", ownerId: "usr_1", name: "Pipes Lab", slug: "pipes-lab", plan: "Pro", createdAt: new Date().toISOString() }],
    memberships: [{ id: "mem_1", workspaceId: "wks_1", userId: "usr_1", role: "Owner", createdAt: new Date().toISOString() }],
    systems: [{
      id: system.id,
      workspaceId: system.workspaceId,
      name: system.name,
      description: system.description,
      createdBy: system.createdBy,
      createdAt: system.createdAt,
      updatedAt: system.updatedAt
    }],
    nodes: sampleData.nodes,
    pipes: sampleData.pipes,
    comments: sampleData.comments.map((c) => ({ id: c.id, systemId: c.systemId, authorId: c.authorId, body: c.body, nodeId: c.targets[0]?.id, createdAt: c.createdAt })),
    versions: [],
    invites: [],
    presence: [],
    planState: [{ workspaceId: "wks_1", plan: "Pro", status: "active", updatedAt: new Date().toISOString() }],
    agentTokens: [],
    audits: [],
    idempotency: [],
    rateLimits: [],
    feedback: [],
    agentSessions: [],
    agentRuns: [],
    runMessages: [],
    runEvents: [],
    graphActionProposals: [],
    appliedGraphActions: [],
    runPlans: [],
    toolCalls: [],
    approvalRequests: [],
    stageRecords: [],
    planRevisions: [],
    roleActivities: [],
    proposalBatches: [],
    subAgentTasks: [],
    subAgentResults: [],
    skillInvocations: [],
    orchestrationSteps: [],
    reconciliationRecords: []
  };
}

function readDb(): DbShape {
  if (!fs.existsSync(DB_FILE)) {
    const initial = seed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Partial<DbShape>;
  return {
    ...(seed() as DbShape),
    ...parsed,
    agentSessions: parsed.agentSessions ?? [],
    agentRuns: parsed.agentRuns ?? [],
    runMessages: parsed.runMessages ?? [],
    runEvents: parsed.runEvents ?? [],
    graphActionProposals: parsed.graphActionProposals ?? [],
    appliedGraphActions: parsed.appliedGraphActions ?? [],
    runPlans: parsed.runPlans ?? [],
    toolCalls: parsed.toolCalls ?? [],
    approvalRequests: parsed.approvalRequests ?? [],
    stageRecords: parsed.stageRecords ?? [],
    planRevisions: parsed.planRevisions ?? [],
    roleActivities: parsed.roleActivities ?? [],
    proposalBatches: parsed.proposalBatches ?? [],
    subAgentTasks: parsed.subAgentTasks ?? [],
    subAgentResults: parsed.subAgentResults ?? [],
    skillInvocations: parsed.skillInvocations ?? [],
    orchestrationSteps: parsed.orchestrationSteps ?? [],
    reconciliationRecords: parsed.reconciliationRecords ?? []
  };
}

function writeDb(data: DbShape) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export const store = {
  readDb,
  writeDb,
  createId
};

export type { DbShape, Membership, PersistedSystem, CommentRecord, VersionRecord, PresenceRecord };
