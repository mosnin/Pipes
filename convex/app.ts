// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const now = () => new Date().toISOString();

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

export const updateFeedbackStatus = mutation({
  args: { workspaceId: v.id("workspaces"), id: v.id("feedback_items"), status: v.union(v.literal("new"), v.literal("reviewing"), v.literal("closed")), updatedBy: v.id("users") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.workspaceId !== args.workspaceId) throw new Error("Feedback not found.");
    await ctx.db.patch(args.id, { status: args.status, updatedAt: now() });
  }
});
