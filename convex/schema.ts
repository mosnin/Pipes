import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    email: v.string(),
    name: v.string(),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_external", ["externalId"]).index("by_email", ["email"]),
  workspaces: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    plan: v.union(v.literal("Free"), v.literal("Pro"), v.literal("Builder")),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_owner", ["ownerId"]),
  workspace_members: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("Owner"), v.literal("Admin"), v.literal("Editor"), v.literal("Commenter"), v.literal("Viewer")),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_workspace", ["workspaceId"]).index("by_workspace_user", ["workspaceId", "userId"]),
  systems: defineTable({
    workspaceId: v.id("workspaces"),
    createdBy: v.id("users"),
    name: v.string(),
    description: v.string(),
    archivedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_workspace", ["workspaceId"]),
  system_nodes: defineTable({
    systemId: v.id("systems"),
    type: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    position: v.object({ x: v.number(), y: v.number() }),
    portIds: v.array(v.string()),
    config: v.optional(v.any()),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_system", ["systemId"]),
  system_pipes: defineTable({
    systemId: v.id("systems"),
    fromNodeId: v.id("system_nodes"),
    fromPortId: v.string(),
    toNodeId: v.id("system_nodes"),
    toPortId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_system", ["systemId"]),
  system_groups: defineTable({ systemId: v.id("systems"), title: v.string(), nodeIds: v.array(v.id("system_nodes")), createdAt: v.string(), updatedAt: v.string() }).index("by_system", ["systemId"]),
  system_annotations: defineTable({ systemId: v.id("systems"), authorId: v.id("users"), text: v.string(), x: v.number(), y: v.number(), createdAt: v.string(), updatedAt: v.string() }).index("by_system", ["systemId"]),
  system_comments: defineTable({ systemId: v.id("systems"), authorId: v.id("users"), body: v.string(), nodeId: v.optional(v.id("system_nodes")), createdAt: v.string(), updatedAt: v.string() }).index("by_system", ["systemId"]),
  system_versions: defineTable({ systemId: v.id("systems"), authorId: v.id("users"), name: v.string(), snapshot: v.string(), createdAt: v.string() }).index("by_system", ["systemId"]),
  system_invites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.string(),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("canceled"), v.literal("expired")),
    invitedBy: v.id("users"),
    acceptedBy: v.optional(v.id("users")),
    acceptedAt: v.optional(v.string()),
    canceledAt: v.optional(v.string()),
    expiresAt: v.string(),
    createdAt: v.string()
  }).index("by_workspace", ["workspaceId"]).index("by_token", ["token"]),
  system_presence: defineTable({ systemId: v.id("systems"), userId: v.id("users"), sessionId: v.string(), selectedNodeId: v.optional(v.id("system_nodes")), editingTarget: v.optional(v.string()), cursor: v.optional(v.object({ x: v.number(), y: v.number() })), lastSeenAt: v.string(), updatedAt: v.string() }).index("by_system", ["systemId"]).index("by_system_user_session", ["systemId", "userId", "sessionId"]),
  plan_state: defineTable({
    workspaceId: v.id("workspaces"),
    plan: v.union(v.literal("Free"), v.literal("Pro"), v.literal("Builder")),
    status: v.union(v.literal("active"), v.literal("canceled"), v.literal("past_due"), v.literal("trialing")),
    externalCustomerId: v.optional(v.string()),
    externalSubscriptionId: v.optional(v.string()),
    updatedAt: v.string()
  }).index("by_workspace", ["workspaceId"]),
  agent_tokens: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    capabilities: v.array(v.string()),
    systemId: v.optional(v.id("systems")),
    tokenHash: v.string(),
    tokenPreview: v.string(),
    createdByUserId: v.id("users"),
    createdAt: v.string(),
    lastUsedAt: v.optional(v.string()),
    revokedAt: v.optional(v.string())
  }).index("by_workspace", ["workspaceId"]).index("by_token_hash", ["tokenHash"]),
  audit_events: defineTable({
    actorType: v.union(v.literal("user"), v.literal("agent")),
    actorId: v.string(),
    workspaceId: v.id("workspaces"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    outcome: v.union(v.literal("success"), v.literal("failure")),
    metadata: v.optional(v.string()),
    systemId: v.optional(v.id("systems")),
    createdAt: v.string()
  }).index("by_workspace", ["workspaceId"]).index("by_workspace_actor", ["workspaceId", "actorType"]).index("by_workspace_action", ["workspaceId", "action"]),
  idempotency_keys: defineTable({
    workspaceId: v.id("workspaces"),
    actorId: v.string(),
    route: v.string(),
    key: v.string(),
    requestHash: v.string(),
    responseJson: v.string(),
    statusCode: v.number(),
    createdAt: v.string()
  }).index("by_lookup", ["workspaceId", "actorId", "route", "key"]),
  rate_limits: defineTable({
    bucket: v.string(),
    windowStart: v.string(),
    count: v.number(),
    updatedAt: v.string()
  }).index("by_bucket_window", ["bucket", "windowStart"]),
  feedback_items: defineTable({
    workspaceId: v.id("workspaces"),
    createdBy: v.id("users"),
    actorType: v.union(v.literal("user"), v.literal("agent")),
    actorId: v.string(),
    category: v.union(v.literal("bug"), v.literal("ux"), v.literal("feature_request"), v.literal("reliability"), v.literal("billing"), v.literal("other")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    summary: v.string(),
    details: v.string(),
    page: v.string(),
    systemId: v.optional(v.id("systems")),
    userEmail: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("reviewing"), v.literal("closed")),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_workspace", ["workspaceId"]),
  agent_sessions: defineTable({
    workspaceId: v.id("workspaces"),
    systemId: v.optional(v.id("systems")),
    title: v.string(),
    createdBy: v.id("users"),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_workspace", ["workspaceId"]),
  agent_runs: defineTable({
    sessionId: v.id("agent_sessions"),
    workspaceId: v.id("workspaces"),
    systemId: v.optional(v.id("systems")),
    status: v.string(),
    userMessageId: v.id("agent_messages"),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_session", ["sessionId"]),
  agent_messages: defineTable({
    sessionId: v.id("agent_sessions"),
    runId: v.optional(v.id("agent_runs")),
    workspaceId: v.id("workspaces"),
    systemId: v.optional(v.id("systems")),
    role: v.string(),
    body: v.string(),
    createdAt: v.string()
  }).index("by_session", ["sessionId"]).index("by_run", ["runId"]),
  agent_run_events: defineTable({
    sessionId: v.id("agent_sessions"),
    runId: v.id("agent_runs"),
    workspaceId: v.id("workspaces"),
    systemId: v.optional(v.id("systems")),
    type: v.string(),
    at: v.string(),
    sequence: v.number(),
    text: v.optional(v.string()),
    status: v.optional(v.string()),
    metadata: v.optional(v.string())
  }).index("by_run", ["runId"]).index("by_session", ["sessionId"]),
  graph_action_proposals: defineTable({
    runId: v.id("agent_runs"),
    sessionId: v.id("agent_sessions"),
    workspaceId: v.id("workspaces"),
    targetSystemId: v.id("systems"),
    actionId: v.string(),
    actionType: v.string(),
    actorType: v.string(),
    actorId: v.string(),
    payload: v.string(),
    rationale: v.string(),
    riskClass: v.string(),
    applyMode: v.string(),
    sequence: v.number(),
    validationStatus: v.string(),
    status: v.string(),
    proposedAt: v.string(),
    appliedAt: v.optional(v.string()),
    reviewDecision: v.optional(v.string()),
    error: v.optional(v.string())
  }).index("by_run", ["runId"]).index("by_system", ["targetSystemId"]),
  applied_graph_actions: defineTable({
    proposalId: v.id("graph_action_proposals"),
    runId: v.id("agent_runs"),
    sessionId: v.id("agent_sessions"),
    workspaceId: v.id("workspaces"),
    targetSystemId: v.id("systems"),
    actionType: v.string(),
    appliedAt: v.string(),
    validationIssueCount: v.number(),
    versionCheckpointId: v.optional(v.id("versions"))
  }).index("by_run", ["runId"]).index("by_system", ["targetSystemId"]),
  run_plans: defineTable({
    runId: v.id("agent_runs"),
    workspaceId: v.id("workspaces"),
    systemId: v.id("systems"),
    summary: v.string(),
    status: v.string(),
    confidence: v.number(),
    requiresApproval: v.boolean(),
    stepsJson: v.string(),
    createdAt: v.string(),
    updatedAt: v.string()
  }).index("by_run", ["runId"]),
  tool_calls: defineTable({
    runId: v.id("agent_runs"),
    workspaceId: v.id("workspaces"),
    systemId: v.id("systems"),
    toolName: v.string(),
    inputJson: v.string(),
    outputJson: v.optional(v.string()),
    status: v.string(),
    error: v.optional(v.string()),
    startedAt: v.string(),
    completedAt: v.optional(v.string())
  }).index("by_run", ["runId"]),
  approval_requests: defineTable({
    runId: v.id("agent_runs"),
    proposalId: v.id("graph_action_proposals"),
    workspaceId: v.id("workspaces"),
    systemId: v.id("systems"),
    targetType: v.string(),
    targetRef: v.string(),
    reason: v.string(),
    status: v.string(),
    decisionNote: v.optional(v.string()),
    requestedAt: v.string(),
    decidedAt: v.optional(v.string()),
    decidedBy: v.optional(v.id("users"))
  }).index("by_run", ["runId"]).index("by_system", ["systemId"])
});
