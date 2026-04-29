// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const now = () => new Date().toISOString();

export const listSystemPresence = query({
  args: { systemId: v.id("systems") },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("system_presence").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect();
    const cutoff = new Date(Date.now() - 120_000).toISOString();
    return rows.filter((r) => r.lastSeenAt > cutoff);
  }
});

export const provisionUser = mutation({
  args: { externalId: v.string(), email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db.query("users").withIndex("by_external", (q) => q.eq("externalId", args.externalId)).first();
    if (!user) {
      const userId = await ctx.db.insert("users", { ...args, createdAt: now(), updatedAt: now() });
      const workspaceId = await ctx.db.insert("workspaces", { ownerId: userId, name: `${args.name.split(" ")[0]}'s Workspace`, slug: `${args.name.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`, plan: "Free", createdAt: now(), updatedAt: now() });
      await ctx.db.insert("workspace_members", { workspaceId, userId, role: "Owner", createdAt: now(), updatedAt: now() });
      await ctx.db.insert("plan_state", { workspaceId, plan: "Free", status: "trialing", updatedAt: now() });
      user = await ctx.db.get(userId);
    }

    const membership = await ctx.db.query("workspace_members").withIndex("by_workspace_user", (q) => q.eq("userId", user!._id).eq("workspaceId", (await ctx.db.query("workspaces").withIndex("by_owner", (qq) => qq.eq("ownerId", user!._id)).first())!._id)).first();
    return { user, membership };
  }
});

export const listSystems = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return ctx.db.query("systems").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
  }
});

export const createSystem = mutation({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users"), name: v.string(), description: v.string() },
  handler: async (ctx, args) => ctx.db.insert("systems", { ...args, createdBy: args.userId, createdAt: now(), updatedAt: now() })
});

export const archiveSystem = mutation({
  args: { systemId: v.id("systems") },
  handler: async (ctx, args) => ctx.db.patch(args.systemId, { archivedAt: now(), updatedAt: now() })
});


export const restoreSystem = mutation({
  args: { systemId: v.id("systems") },
  handler: async (ctx, args) => ctx.db.patch(args.systemId, { archivedAt: undefined, updatedAt: now() })
});
export const getSystemBundle = query({
  args: { systemId: v.id("systems") },
  handler: async (ctx, args) => {
    const [system, nodes, pipes, comments, versions, presence] = await Promise.all([
      ctx.db.get(args.systemId),
      ctx.db.query("system_nodes").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect(),
      ctx.db.query("system_pipes").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect(),
      ctx.db.query("system_comments").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect(),
      ctx.db.query("system_versions").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect(),
      ctx.db.query("system_presence").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect()
    ]);
    return { system, nodes, pipes, comments, versions, presence };
  }
});

export const addNode = mutation({
  args: { systemId: v.id("systems"), type: v.string(), title: v.string(), description: v.optional(v.string()), x: v.number(), y: v.number() },
  handler: async (ctx, args) => {
    const nodeId = await ctx.db.insert("system_nodes", { systemId: args.systemId, type: args.type, title: args.title, description: args.description, position: { x: args.x, y: args.y }, portIds: [`${Math.random().toString(36).slice(2)}_in`, `${Math.random().toString(36).slice(2)}_out`], config: {}, createdAt: now(), updatedAt: now() });
    return nodeId;
  }
});

export const updateNode = mutation({
  args: { nodeId: v.id("system_nodes"), title: v.optional(v.string()), description: v.optional(v.string()), x: v.optional(v.number()), y: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) return;
    await ctx.db.patch(args.nodeId, { title: args.title ?? node.title, description: args.description ?? node.description, position: { x: args.x ?? node.position.x, y: args.y ?? node.position.y }, updatedAt: now() });
  }
});

export const deleteNode = mutation({
  args: { nodeId: v.id("system_nodes") },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) return;
    const pipes = await ctx.db.query("system_pipes").withIndex("by_system", (q) => q.eq("systemId", node.systemId)).collect();
    for (const pipe of pipes) {
      if (pipe.fromNodeId === args.nodeId || pipe.toNodeId === args.nodeId) await ctx.db.delete(pipe._id);
    }
    await ctx.db.delete(args.nodeId);
  }
});

export const addPipe = mutation({
  args: { systemId: v.id("systems"), fromNodeId: v.id("system_nodes"), fromPortId: v.string(), toNodeId: v.id("system_nodes"), toPortId: v.string() },
  handler: async (ctx, args) => ctx.db.insert("system_pipes", { ...args, createdAt: now(), updatedAt: now() })
});

export const deletePipe = mutation({
  args: { pipeId: v.id("system_pipes") },
  handler: async (ctx, args) => ctx.db.delete(args.pipeId)
});

export const addComment = mutation({
  args: { systemId: v.id("systems"), authorId: v.id("users"), body: v.string(), nodeId: v.optional(v.id("system_nodes")) },
  handler: async (ctx, args) => ctx.db.insert("system_comments", { ...args, createdAt: now(), updatedAt: now() })
});

export const addVersion = mutation({
  args: { systemId: v.id("systems"), authorId: v.id("users"), name: v.string(), snapshot: v.string() },
  handler: async (ctx, args) => ctx.db.insert("system_versions", { ...args, createdAt: now() })
});

export const upsertPresence = mutation({
  args: { systemId: v.id("systems"), userId: v.id("users"), sessionId: v.string(), selectedNodeId: v.optional(v.id("system_nodes")), editingTarget: v.optional(v.string()), cursorX: v.optional(v.number()), cursorY: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("system_presence").withIndex("by_system_user_session", (q) => q.eq("systemId", args.systemId).eq("userId", args.userId).eq("sessionId", args.sessionId)).first();
    const payload = { systemId: args.systemId, userId: args.userId, sessionId: args.sessionId, selectedNodeId: args.selectedNodeId, editingTarget: args.editingTarget, cursor: args.cursorX !== undefined && args.cursorY !== undefined ? { x: args.cursorX, y: args.cursorY } : undefined, lastSeenAt: now(), updatedAt: now() };
    if (existing) await ctx.db.patch(existing._id, payload); else await ctx.db.insert("system_presence", payload);

    const rows = await ctx.db.query("system_presence").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect();
    const cutoff = Date.now() - 120000;
    for (const row of rows) {
      if (new Date(row.lastSeenAt).getTime() < cutoff) await ctx.db.delete(row._id);
    }
  }
});

export const addCollaborator = mutation({
  args: { workspaceId: v.id("workspaces"), userId: v.optional(v.id("users")), email: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    if (args.userId) {
      await ctx.db.insert("workspace_members", { workspaceId: args.workspaceId, userId: args.userId, role: args.role as never, createdAt: now(), updatedAt: now() });
      return;
    }
    await ctx.db.insert("system_invites", { workspaceId: args.workspaceId, email: args.email, role: args.role, createdAt: now() });
  }
});

export const listWorkspaceMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return ctx.db.query("workspace_members").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
  }
});

export const listInvites = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return ctx.db.query("system_invites").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
  }
});

export const createInvite = mutation({
  args: { workspaceId: v.id("workspaces"), invitedBy: v.id("users"), email: v.string(), role: v.string(), token: v.string(), expiresAt: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("system_invites", { workspaceId: args.workspaceId, invitedBy: args.invitedBy, email: args.email, role: args.role, token: args.token, status: "pending", expiresAt: args.expiresAt, createdAt: now() });
  }
});

export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => ctx.db.query("system_invites").withIndex("by_token", (q) => q.eq("token", args.token)).first()
});

export const acceptInvite = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("system_invites").withIndex("by_token", (q) => q.eq("token", args.token)).first();
    if (!invite) throw new Error("Invite not found.");
    await ctx.db.patch(invite._id, { status: "accepted", acceptedBy: args.userId, acceptedAt: now() });
    const existing = await ctx.db.query("workspace_members").withIndex("by_workspace_user", (q) => q.eq("workspaceId", invite.workspaceId).eq("userId", args.userId)).first();
    if (!existing) {
      await ctx.db.insert("workspace_members", { workspaceId: invite.workspaceId, userId: args.userId, role: invite.role as never, createdAt: now(), updatedAt: now() });
    }
  }
});

export const cancelInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("system_invites").withIndex("by_token", (q) => q.eq("token", args.token)).first();
    if (!invite) throw new Error("Invite not found.");
    await ctx.db.patch(invite._id, { status: "canceled", canceledAt: now() });
  }
});

export const updateMemberRole = mutation({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("workspace_members").withIndex("by_workspace_user", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)).first();
    if (!row) throw new Error("Membership not found.");
    await ctx.db.patch(row._id, { role: args.role as never, updatedAt: now() });
  }
});

export const getPlanState = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => ctx.db.query("plan_state").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).first()
});

export const upsertPlanState = mutation({
  args: { workspaceId: v.id("workspaces"), plan: v.union(v.literal("Free"), v.literal("Pro"), v.literal("Builder")), status: v.union(v.literal("active"), v.literal("canceled"), v.literal("past_due"), v.literal("trialing")), externalCustomerId: v.optional(v.string()), externalSubscriptionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("plan_state").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).first();
    if (row) await ctx.db.patch(row._id, { plan: args.plan, status: args.status, externalCustomerId: args.externalCustomerId, externalSubscriptionId: args.externalSubscriptionId, updatedAt: now() });
    else await ctx.db.insert("plan_state", { workspaceId: args.workspaceId, plan: args.plan, status: args.status, externalCustomerId: args.externalCustomerId, externalSubscriptionId: args.externalSubscriptionId, updatedAt: now() });
  }
});

export const createAgentToken = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    capabilities: v.array(v.string()),
    systemId: v.optional(v.id("systems")),
    tokenHash: v.string(),
    tokenPreview: v.string(),
    createdByUserId: v.id("users")
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("agent_tokens", {
      workspaceId: args.workspaceId,
      name: args.name,
      capabilities: args.capabilities,
      systemId: args.systemId,
      tokenHash: args.tokenHash,
      tokenPreview: args.tokenPreview,
      createdByUserId: args.createdByUserId,
      createdAt: now()
    });
  }
});

export const listAgentTokens = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => ctx.db.query("agent_tokens").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()
});

export const getAgentTokenByHash = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => ctx.db.query("agent_tokens").withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash)).first()
});

export const revokeAgentToken = mutation({
  args: { tokenId: v.id("agent_tokens") },
  handler: async (ctx, args) => ctx.db.patch(args.tokenId, { revokedAt: now() })
});

export const touchAgentToken = mutation({
  args: { tokenId: v.id("agent_tokens") },
  handler: async (ctx, args) => ctx.db.patch(args.tokenId, { lastUsedAt: now() })
});

export const addAuditEvent = mutation({
  args: {
    actorType: v.union(v.literal("user"), v.literal("agent")),
    actorId: v.string(),
    workspaceId: v.id("workspaces"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    outcome: v.union(v.literal("success"), v.literal("failure")),
    metadata: v.optional(v.string()),
    systemId: v.optional(v.id("systems"))
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_events", { ...args, createdAt: now() });
  }
});

export const listAuditEvents = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => ctx.db.query("audit_events").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()
});

export const getIdempotencyKey = query({
  args: { workspaceId: v.id("workspaces"), actorId: v.string(), route: v.string(), key: v.string() },
  handler: async (ctx, args) => ctx.db.query("idempotency_keys").withIndex("by_lookup", (q) => q.eq("workspaceId", args.workspaceId).eq("actorId", args.actorId).eq("route", args.route).eq("key", args.key)).first()
});

export const putIdempotencyKey = mutation({
  args: { workspaceId: v.id("workspaces"), actorId: v.string(), route: v.string(), key: v.string(), requestHash: v.string(), responseJson: v.string(), statusCode: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("idempotency_keys").withIndex("by_lookup", (q) => q.eq("workspaceId", args.workspaceId).eq("actorId", args.actorId).eq("route", args.route).eq("key", args.key)).first();
    if (existing) return;
    await ctx.db.insert("idempotency_keys", { ...args, createdAt: now() });
  }
});

export const consumeRateLimit = mutation({
  args: { bucket: v.string(), windowStart: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("rate_limits").withIndex("by_bucket_window", (q) => q.eq("bucket", args.bucket).eq("windowStart", args.windowStart)).first();
    if (row) {
      await ctx.db.patch(row._id, { count: row.count + 1, updatedAt: now() });
      return row.count + 1;
    }
    await ctx.db.insert("rate_limits", { bucket: args.bucket, windowStart: args.windowStart, count: 1, updatedAt: now() });
    return 1;
  }
});

export const createFeedbackItem = mutation({
  args: {
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
    userEmail: v.optional(v.string())
  },
  handler: async (ctx, args) => ctx.db.insert("feedback_items", { ...args, status: "new", createdAt: now(), updatedAt: now() })
});

export const listFeedbackItems = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => ctx.db.query("feedback_items").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()
});

export const createAgentSession = mutation({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), title: v.string(), createdBy: v.id("users") },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("agent_sessions", { ...args, createdAt: now(), updatedAt: now() });
    return ctx.db.get(id);
  }
});

export const listAgentSessions = query({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("agent_sessions").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
    return rows.filter((row) => !args.systemId || row.systemId === args.systemId);
  }
});

export const addAgentMessage = mutation({
  args: { sessionId: v.id("agent_sessions"), runId: v.optional(v.id("agent_runs")), workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), role: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("agent_messages", { ...args, createdAt: now() });
    return ctx.db.get(id);
  }
});

export const listAgentMessages = query({
  args: { sessionId: v.id("agent_sessions") },
  handler: async (ctx, args) => ctx.db.query("agent_messages").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).collect()
});

export const createAgentRun = mutation({
  args: { sessionId: v.id("agent_sessions"), workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), userMessageId: v.id("agent_messages") },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("agent_runs", { ...args, status: "created", createdAt: now(), updatedAt: now() });
    return ctx.db.get(id);
  }
});

export const patchAgentRun = mutation({
  args: { runId: v.id("agent_runs"), status: v.string(), startedAt: v.optional(v.string()), endedAt: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return;
    await ctx.db.patch(args.runId, { status: args.status, startedAt: args.startedAt ?? run.startedAt, endedAt: args.endedAt ?? run.endedAt, error: args.error ?? run.error, updatedAt: now() });
  }
});

export const getAgentRun = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.get(args.runId)
});

export const addAgentRunEvent = mutation({
  args: { sessionId: v.id("agent_sessions"), runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), type: v.string(), at: v.string(), sequence: v.number(), text: v.optional(v.string()), status: v.optional(v.string()), metadata: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("agent_run_events", args);
    return ctx.db.get(id);
  }
});

export const listAgentRunEvents = query({
  args: { runId: v.optional(v.id("agent_runs")), sessionId: v.optional(v.id("agent_sessions")) },
  handler: async (ctx, args) => {
    if (args.runId) return ctx.db.query("agent_run_events").withIndex("by_run", (q) => q.eq("runId", args.runId!)).collect();
    if (args.sessionId) return ctx.db.query("agent_run_events").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!)).collect();
    return [];
  }
});

export const addGraphActionProposal = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("graph_action_proposals", args);
    return ctx.db.get(id);
  }
});

export const patchGraphActionProposal = mutation({
  args: { proposalId: v.id("graph_action_proposals"), status: v.string(), appliedAt: v.optional(v.string()), reviewDecision: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.proposalId);
    if (!row) return;
    await ctx.db.patch(args.proposalId, {
      status: args.status,
      appliedAt: args.appliedAt ?? row.appliedAt,
      reviewDecision: args.reviewDecision ?? row.reviewDecision,
      error: args.error ?? row.error
    });
  }
});

export const getGraphActionProposal = query({
  args: { proposalId: v.id("graph_action_proposals") },
  handler: async (ctx, args) => ctx.db.get(args.proposalId)
});

export const listGraphActionProposals = query({
  args: { runId: v.optional(v.id("agent_runs")), systemId: v.optional(v.id("systems")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = args.runId
      ? await ctx.db.query("graph_action_proposals").withIndex("by_run", (q) => q.eq("runId", args.runId!)).collect()
      : args.systemId
        ? await ctx.db.query("graph_action_proposals").withIndex("by_system", (q) => q.eq("targetSystemId", args.systemId!)).collect()
        : [];
    return rows.filter((row) => !args.status || row.status === args.status);
  }
});

export const addAppliedGraphAction = mutation({
  args: {
    proposalId: v.id("graph_action_proposals"),
    runId: v.id("agent_runs"),
    sessionId: v.id("agent_sessions"),
    workspaceId: v.id("workspaces"),
    targetSystemId: v.id("systems"),
    actionType: v.string(),
    appliedAt: v.string(),
    validationIssueCount: v.number(),
    versionCheckpointId: v.optional(v.id("versions"))
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("applied_graph_actions", args);
    return ctx.db.get(id);
  }
});

export const listAppliedGraphActions = query({
  args: { runId: v.optional(v.id("agent_runs")), systemId: v.optional(v.id("systems")) },
  handler: async (ctx, args) => {
    if (args.runId) return ctx.db.query("applied_graph_actions").withIndex("by_run", (q) => q.eq("runId", args.runId!)).collect();
    if (args.systemId) return ctx.db.query("applied_graph_actions").withIndex("by_system", (q) => q.eq("targetSystemId", args.systemId!)).collect();
    return [];
  }
});

export const upsertRunPlan = mutation({
  args: { planId: v.optional(v.id("run_plans")), runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), summary: v.string(), status: v.string(), confidence: v.number(), requiresApproval: v.boolean(), stepsJson: v.string() },
  handler: async (ctx, args) => {
    if (args.planId) {
      await ctx.db.patch(args.planId, { summary: args.summary, status: args.status, confidence: args.confidence, requiresApproval: args.requiresApproval, stepsJson: args.stepsJson, updatedAt: now() });
      return ctx.db.get(args.planId);
    }
    const id = await ctx.db.insert("run_plans", { ...args, createdAt: now(), updatedAt: now() });
    return ctx.db.get(id);
  }
});

export const getRunPlan = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("run_plans").withIndex("by_run", (q) => q.eq("runId", args.runId)).first()
});

export const addToolCall = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), toolName: v.string(), inputJson: v.string(), outputJson: v.optional(v.string()), status: v.string(), error: v.optional(v.string()), startedAt: v.string(), completedAt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tool_calls", args);
    return ctx.db.get(id);
  }
});

export const listToolCalls = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("tool_calls").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});

export const addApprovalRequest = mutation({
  args: { runId: v.id("agent_runs"), proposalId: v.id("graph_action_proposals"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), targetType: v.string(), targetRef: v.string(), reason: v.string(), status: v.string(), decisionNote: v.optional(v.string()), requestedAt: v.string(), decidedAt: v.optional(v.string()), decidedBy: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("approval_requests", args);
    return ctx.db.get(id);
  }
});

export const listApprovalRequests = query({
  args: { runId: v.optional(v.id("agent_runs")), systemId: v.optional(v.id("systems")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = args.runId
      ? await ctx.db.query("approval_requests").withIndex("by_run", (q) => q.eq("runId", args.runId!)).collect()
      : args.systemId
        ? await ctx.db.query("approval_requests").withIndex("by_system", (q) => q.eq("systemId", args.systemId!)).collect()
        : [];
    return rows.filter((row) => !args.status || row.status === args.status);
  }
});

export const getApprovalRequest = query({
  args: { requestId: v.id("approval_requests") },
  handler: async (ctx, args) => ctx.db.get(args.requestId)
});

export const patchApprovalRequest = mutation({
  args: { requestId: v.id("approval_requests"), status: v.string(), decidedAt: v.optional(v.string()), decidedBy: v.optional(v.id("users")), decisionNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.requestId);
    if (!row) return;
    await ctx.db.patch(args.requestId, { status: args.status, decidedAt: args.decidedAt ?? row.decidedAt, decidedBy: args.decidedBy ?? row.decidedBy, decisionNote: args.decisionNote ?? row.decisionNote });
  }
});

export const addRunStageRecord = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), stage: v.string(), status: v.string(), summary: v.optional(v.string()), at: v.string() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("run_stage_records", args);
    return ctx.db.get(id);
  }
});
export const listRunStageRecords = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("run_stage_records").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});

export const addPlanRevision = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), version: v.number(), summary: v.string(), critique: v.optional(v.string()), assumptionsJson: v.string(), openQuestionsJson: v.string(), unresolvedRisksJson: v.string(), recommendedNextStepsJson: v.string(), createdAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("plan_revisions", args); return ctx.db.get(id); }
});
export const listPlanRevisions = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("plan_revisions").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});

export const addRoleActivity = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), stage: v.string(), role: v.string(), summary: v.string(), startedAt: v.string(), completedAt: v.optional(v.string()) },
  handler: async (ctx, args) => { const id = await ctx.db.insert("role_activities", args); return ctx.db.get(id); }
});
export const listRoleActivities = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("role_activities").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});

export const addProposalBatch = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), stage: v.string(), summary: v.string(), rationale: v.string(), proposalIdsJson: v.string(), status: v.string(), createdAt: v.string(), updatedAt: v.string(), reviewerNote: v.optional(v.string()) },
  handler: async (ctx, args) => { const id = await ctx.db.insert("proposal_batches", args); return ctx.db.get(id); }
});
export const patchProposalBatch = mutation({
  args: { batchId: v.id("proposal_batches"), status: v.string(), updatedAt: v.optional(v.string()), reviewerNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.batchId);
    if (!row) return;
    await ctx.db.patch(args.batchId, { status: args.status, updatedAt: args.updatedAt ?? row.updatedAt, reviewerNote: args.reviewerNote ?? row.reviewerNote });
  }
});
export const listProposalBatches = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("proposal_batches").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});

export const addSubAgentTask = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), stage: v.string(), role: v.string(), skillId: v.string(), title: v.string(), contextPackJson: v.string(), status: v.string(), createdAt: v.string(), startedAt: v.optional(v.string()), completedAt: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, args) => { const id = await ctx.db.insert("sub_agent_tasks", args); return ctx.db.get(id); }
});
export const patchSubAgentTask = mutation({
  args: { taskId: v.id("sub_agent_tasks"), status: v.string(), startedAt: v.optional(v.string()), completedAt: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.taskId);
    if (!row) return;
    await ctx.db.patch(args.taskId, { status: args.status, startedAt: args.startedAt ?? row.startedAt, completedAt: args.completedAt ?? row.completedAt, error: args.error ?? row.error });
  }
});
export const listSubAgentTasks = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("sub_agent_tasks").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});
export const addSubAgentResult = mutation({
  args: { taskId: v.id("sub_agent_tasks"), runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), planSummary: v.optional(v.string()), critique: v.optional(v.string()), proposedActionTypesJson: v.string(), openQuestionsJson: v.string(), conflictSignalsJson: v.string(), createdAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("sub_agent_results", args); return ctx.db.get(id); }
});
export const listSubAgentResults = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("sub_agent_results").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});
export const addSkillInvocation = mutation({
  args: { taskId: v.id("sub_agent_tasks"), runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), skillId: v.string(), inputSummary: v.string(), status: v.string(), outputSummary: v.optional(v.string()), createdAt: v.string(), completedAt: v.optional(v.string()) },
  handler: async (ctx, args) => { const id = await ctx.db.insert("skill_invocations", args); return ctx.db.get(id); }
});
export const listSkillInvocations = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("skill_invocations").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});
export const addOrchestrationStep = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), stage: v.string(), decision: v.string(), summary: v.string(), at: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("orchestration_steps", args); return ctx.db.get(id); }
});
export const listOrchestrationSteps = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("orchestration_steps").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});
export const addReconciliationRecord = mutation({
  args: { runId: v.id("agent_runs"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), inputTaskIdsJson: v.string(), decision: v.string(), summary: v.string(), createdAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("reconciliation_records", args); return ctx.db.get(id); }
});
export const listReconciliationRecords = query({
  args: { runId: v.id("agent_runs") },
  handler: async (ctx, args) => ctx.db.query("reconciliation_records").withIndex("by_run", (q) => q.eq("runId", args.runId)).collect()
});

export const updateFeedbackStatus = mutation({
  args: { workspaceId: v.id("workspaces"), id: v.id("feedback_items"), status: v.union(v.literal("new"), v.literal("reviewing"), v.literal("closed")), updatedBy: v.id("users") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.workspaceId !== args.workspaceId) throw new Error("Feedback not found.");
    await ctx.db.patch(args.id, { status: args.status, updatedAt: now() });
  }
});

export const addMemoryEntry = mutation({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), sessionId: v.optional(v.id("agent_sessions")), runId: v.optional(v.id("agent_runs")), scope: v.string(), type: v.string(), source: v.string(), confidence: v.string(), status: v.string(), title: v.string(), summary: v.string(), detail: v.optional(v.string()), tagsJson: v.string(), provenanceJson: v.string(), staleAfter: v.optional(v.string()), createdAt: v.string(), updatedAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("memory_entries", args); return ctx.db.get(id); }
});
export const listMemoryEntries = query({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), sessionId: v.optional(v.id("agent_sessions")), runId: v.optional(v.id("agent_runs")), status: v.optional(v.string()), type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("memory_entries").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
    return rows.filter((row) => (!args.systemId || row.systemId === args.systemId) && (!args.sessionId || row.sessionId === args.sessionId) && (!args.runId || row.runId === args.runId) && (!args.status || row.status === args.status) && (!args.type || row.type === args.type));
  }
});
export const patchMemoryEntry = mutation({
  args: { memoryEntryId: v.id("memory_entries"), status: v.optional(v.string()), confidence: v.optional(v.string()), updatedAt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.memoryEntryId);
    if (!row) return;
    await ctx.db.patch(args.memoryEntryId, { status: args.status ?? row.status, confidence: args.confidence ?? row.confidence, updatedAt: args.updatedAt ?? row.updatedAt });
  }
});

export const addBuilderStrategy = mutation({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), scope: v.string(), name: v.string(), summary: v.string(), planningDirectivesJson: v.string(), batchingDirectivesJson: v.string(), reviewPosture: v.string(), confidence: v.string(), status: v.string(), createdAt: v.string(), updatedAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("builder_strategies", args); return ctx.db.get(id); }
});
export const listBuilderStrategies = query({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("builder_strategies").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
    return rows.filter((row) => (!args.systemId || row.systemId === args.systemId) && (!args.status || row.status === args.status));
  }
});

export const addPatternArtifact = mutation({
  args: { workspaceId: v.id("workspaces"), systemId: v.id("systems"), runId: v.optional(v.id("agent_runs")), scope: v.string(), title: v.string(), summary: v.string(), intendedUse: v.string(), inputContractSummary: v.string(), outputContractSummary: v.string(), riskNotes: v.string(), tagsJson: v.string(), provenanceJson: v.string(), status: v.string(), createdAt: v.string(), updatedAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("pattern_artifacts", args); return ctx.db.get(id); }
});
export const listPatternArtifacts = query({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), status: v.optional(v.string()), tag: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("pattern_artifacts").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
    return rows.filter((row) => (!args.systemId || row.systemId === args.systemId) && (!args.status || row.status === args.status) && (!args.tag || JSON.parse(row.tagsJson).includes(args.tag)));
  }
});

export const addReusableSubsystemPattern = mutation({
  args: { patternArtifactId: v.id("pattern_artifacts"), workspaceId: v.id("workspaces"), systemId: v.id("systems"), subsystemId: v.string(), subsystemSummary: v.string(), tagsJson: v.string(), createdAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("reusable_subsystem_patterns", args); return ctx.db.get(id); }
});
export const listReusableSubsystemPatterns = query({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), subsystemId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("reusable_subsystem_patterns").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
    return rows.filter((row) => (!args.systemId || row.systemId === args.systemId) && (!args.subsystemId || row.subsystemId === args.subsystemId));
  }
});

export const addDecisionRecord = mutation({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), runId: v.optional(v.id("agent_runs")), category: v.string(), title: v.string(), decision: v.string(), rationale: v.string(), state: v.string(), confidence: v.string(), staleAfter: v.optional(v.string()), createdAt: v.string(), updatedAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("decision_records", args); return ctx.db.get(id); }
});
export const listDecisionRecords = query({
  args: { workspaceId: v.id("workspaces"), systemId: v.optional(v.id("systems")), runId: v.optional(v.id("agent_runs")) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("decision_records").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect();
    return rows.filter((row) => (!args.systemId || row.systemId === args.systemId) && (!args.runId || row.runId === args.runId));
  }
});

export const addSessionContinuationRef = mutation({
  args: { workspaceId: v.id("workspaces"), systemId: v.id("systems"), fromRunId: v.id("agent_runs"), toRunId: v.id("agent_runs"), attachedMemoryEntryIdsJson: v.string(), attachedPatternIdsJson: v.string(), attachedDecisionIdsJson: v.string(), strategyId: v.optional(v.id("builder_strategies")), summary: v.string(), createdAt: v.string() },
  handler: async (ctx, args) => { const id = await ctx.db.insert("session_continuation_refs", args); return ctx.db.get(id); }
});
export const listSessionContinuationRefs = query({
  args: { workspaceId: v.id("workspaces"), systemId: v.id("systems"), runId: v.optional(v.id("agent_runs")) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("session_continuation_refs").withIndex("by_system", (q) => q.eq("systemId", args.systemId)).collect();
    return rows.filter((row) => row.workspaceId === args.workspaceId && (!args.runId || row.toRunId === args.runId));
  }
});
