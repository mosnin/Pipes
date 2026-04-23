import { store } from "@/lib/convex/store";
import type { Plan, Role } from "@/domain/pipes_schema_v1/schema";
import type { AppContext, RepositorySet, SystemBundle } from "@/lib/repositories/contracts";

const now = () => new Date().toISOString();

async function provision(identity: { externalId: string; email: string; name: string }): Promise<AppContext> {
  const db = store.readDb();
  let user = db.users.find((u) => u.externalId === identity.externalId);

  if (!user) {
    user = { id: store.createId("usr"), externalId: identity.externalId, email: identity.email, name: identity.name, createdAt: now() };
    db.users.push(user);
    const workspaceId = store.createId("wks");
    db.workspaces.push({ id: workspaceId, ownerId: user.id, name: `${identity.name.split(" ")[0]}'s Workspace`, slug: `${identity.name.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`, plan: "Free", createdAt: now() });
    db.memberships.push({ id: store.createId("mem"), workspaceId, userId: user.id, role: "Owner", createdAt: now() });
    db.planState.push({ workspaceId, plan: "Free", status: "trialing", updatedAt: now() });
    store.writeDb(db);
  }

  const membership = db.memberships.find((m) => m.userId === user.id) ?? db.memberships[0];
  const plan = db.planState.find((p) => p.workspaceId === membership.workspaceId)?.plan ?? "Free";
  return { userId: user.id, workspaceId: membership.workspaceId, role: membership.role, plan, actorType: "user", actorId: user.id };
}

function getBundle(systemId: string): SystemBundle {
  const db = store.readDb();
  const system = db.systems.find((s) => s.id === systemId && !s.archivedAt);
  if (!system) throw new Error("System not found.");
  const usersById = new Map(db.users.map((u) => [u.id, u]));
  return {
    system,
    nodes: db.nodes.filter((n) => n.systemId === systemId),
    pipes: db.pipes
      .filter((p) => p.systemId === systemId)
      .map((p) => ({ ...p, fromNodeId: db.nodes.find((n) => n.portIds.includes(p.fromPortId))?.id, toNodeId: db.nodes.find((n) => n.portIds.includes(p.toPortId))?.id })),
    comments: db.comments.filter((c) => c.systemId === systemId),
    versions: db.versions.filter((v) => v.systemId === systemId),
    presence: db.presence.filter((p) => p.systemId === systemId).map((p) => ({ ...p, name: usersById.get(p.userId)?.name ?? p.name }))
  };
}

export function createMockRepositories(): RepositorySet {
  return {
    users: {
      provision,
      async findByEmail(email) {
        const user = store.readDb().users.find((u) => u.email === email);
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      }
    },
    workspaces: {
      async getPlan(workspaceId) {
        return store.readDb().planState.find((p) => p.workspaceId === workspaceId)?.plan ?? "Free";
      }
    },
    memberships: {
      async add(workspaceId, userId, role) {
        const db = store.readDb();
        const exists = db.memberships.some((m) => m.workspaceId === workspaceId && m.userId === userId);
        if (!exists) {
          db.memberships.push({ id: store.createId("mem"), workspaceId, userId, role, createdAt: now() });
          store.writeDb(db);
        }
      },
      async list(workspaceId) {
        return store.readDb().memberships.filter((m) => m.workspaceId === workspaceId).map((m) => ({ userId: m.userId, role: m.role }));
      },
      async updateRole(workspaceId, userId, role) {
        const db = store.readDb();
        const row = db.memberships.find((m) => m.workspaceId === workspaceId && m.userId === userId);
        if (!row) throw new Error("Membership not found.");
        row.role = role;
        store.writeDb(db);
      }
    },
    systems: {
      async list(workspaceId) {
        return store.readDb().systems.filter((system) => system.workspaceId === workspaceId);
      },
      async create(input) {
        const db = store.readDb();
        const systemId = store.createId("sys");
        db.systems.push({ id: systemId, workspaceId: input.workspaceId, name: input.name, description: input.description, createdBy: input.userId, createdAt: now(), updatedAt: now() });
        store.writeDb(db);
        return systemId;
      },
      async getBundle(systemId) {
        return getBundle(systemId);
      },
      async archive(systemId) {
        const db = store.readDb();
        const system = db.systems.find((s) => s.id === systemId);
        if (!system) throw new Error("System not found.");
        system.archivedAt = now();
        system.updatedAt = now();
        store.writeDb(db);
      },
      async restore(systemId) {
        const db = store.readDb();
        const system = db.systems.find((s) => s.id === systemId);
        if (!system) throw new Error("System not found.");
        delete system.archivedAt;
        system.updatedAt = now();
        store.writeDb(db);
      }
    },
    graph: {
      async addNode(input) {
        const db = store.readDb();
        const id = store.createId("n");
        db.nodes.push({ id, systemId: input.systemId, type: input.type as never, title: input.title, description: input.description, position: { x: input.x, y: input.y }, config: {}, portIds: [`${id}_in`, `${id}_out`] });
        store.writeDb(db);
        return id;
      },
      async updateNode(input) {
        const db = store.readDb();
        const node = db.nodes.find((n) => n.id === input.nodeId);
        if (!node) throw new Error("Node not found.");
        if (input.title !== undefined) node.title = input.title;
        if (input.description !== undefined) node.description = input.description;
        if (input.position) node.position = input.position;
        store.writeDb(db);
      },
      async deleteNode(nodeId) {
        const db = store.readDb();
        db.nodes = db.nodes.filter((n) => n.id !== nodeId);
        db.pipes = db.pipes.filter((pipe) => {
          const fromNodeId = db.nodes.find((n) => n.portIds.includes(pipe.fromPortId))?.id;
          const toNodeId = db.nodes.find((n) => n.portIds.includes(pipe.toPortId))?.id;
          return fromNodeId !== nodeId && toNodeId !== nodeId;
        });
        store.writeDb(db);
      },
      async addPipe(input) {
        const db = store.readDb();
        const fromNode = db.nodes.find((n) => n.id === input.fromNodeId);
        const toNode = db.nodes.find((n) => n.id === input.toNodeId);
        if (!fromNode || !toNode) throw new Error("Nodes not found.");
        const pipeId = store.createId("pipe");
        db.pipes.push({ id: pipeId, systemId: input.systemId, fromPortId: fromNode.portIds.find((pid) => pid.endsWith("_out")) ?? fromNode.portIds[0], toPortId: toNode.portIds.find((pid) => pid.endsWith("_in")) ?? toNode.portIds[0] });
        store.writeDb(db);
        return pipeId;
      },
      async deletePipe(pipeId) {
        const db = store.readDb();
        db.pipes = db.pipes.filter((p) => p.id !== pipeId);
        store.writeDb(db);
      }
    },
    comments: {
      async add(input) {
        const db = store.readDb();
        db.comments.push({ id: store.createId("com"), systemId: input.systemId, authorId: input.authorId, body: input.body, nodeId: input.nodeId, createdAt: now() });
        store.writeDb(db);
      }
    },
    versions: {
      async list(systemId) {
        return store.readDb().versions.filter((v) => v.systemId === systemId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      },
      async add(input) {
        const db = store.readDb();
        db.versions.push({ id: store.createId("ver"), systemId: input.systemId, name: input.name, authorId: input.authorId, createdAt: now(), snapshot: input.snapshot });
        store.writeDb(db);
      },
      async get(systemId, versionId) {
        return store.readDb().versions.find((v) => v.systemId === systemId && v.id === versionId) ?? null;
      },
      async restoreSnapshot(systemId, snapshot) {
        const parsed = JSON.parse(snapshot) as { nodes: Array<{ systemId: string }>; pipes: Array<{ systemId: string }> };
        const db = store.readDb();
        db.nodes = db.nodes.filter((n) => n.systemId !== systemId).concat((parsed.nodes as never[]).filter((n: any) => n.systemId === systemId));
        db.pipes = db.pipes.filter((p) => p.systemId !== systemId).concat((parsed.pipes as never[]).filter((p: any) => p.systemId === systemId));
        store.writeDb(db);
      }
    },
    invites: {
      async add(input) {
        const db = store.readDb();
        db.invites.push({ id: store.createId("inv"), workspaceId: input.workspaceId, email: input.email, role: input.role, token: input.token, status: "pending", invitedBy: input.invitedBy, createdAt: now(), expiresAt: input.expiresAt });
        store.writeDb(db);
      },
      async list(workspaceId) {
        return store.readDb().invites.filter((i) => i.workspaceId === workspaceId).map((i) => ({ token: i.token, email: i.email, role: i.role, status: i.status, expiresAt: i.expiresAt }));
      },
      async getByToken(token) {
        const invite = store.readDb().invites.find((i) => i.token === token) ?? null;
        if (!invite) return null;
        return { workspaceId: invite.workspaceId, token: invite.token, email: invite.email, role: invite.role, status: invite.status, expiresAt: invite.expiresAt };
      },
      async accept(token, userId) {
        const db = store.readDb();
        const invite = db.invites.find((i) => i.token === token);
        if (!invite) throw new Error("Invite not found.");
        invite.status = "accepted";
        invite.acceptedBy = userId;
        invite.acceptedAt = now();
        store.writeDb(db);
      },
      async cancel(token) {
        const db = store.readDb();
        const invite = db.invites.find((i) => i.token === token);
        if (!invite) throw new Error("Invite not found.");
        invite.status = "canceled";
        invite.canceledAt = now();
        store.writeDb(db);
      }
    },
    presence: {
      async upsert(input) {
        const db = store.readDb();
        const user = db.users.find((u) => u.id === input.userId);
        db.presence = db.presence.filter((p) => !(p.systemId === input.systemId && p.userId === input.userId));
        db.presence.push({ id: store.createId("prs"), systemId: input.systemId, userId: input.userId, name: user?.name ?? "Unknown", selectedNodeId: input.selectedNodeId, updatedAt: now() });
        db.presence = db.presence.filter((item) => Date.now() - new Date(item.updatedAt).getTime() < 120000);
        store.writeDb(db);
      },
      async list(systemId) {
        return store.readDb().presence.filter((p) => p.systemId === systemId).map((p) => ({ ...p, editingTarget: undefined, cursor: undefined }));
      }
    },
    entitlements: {
      async getPlan(workspaceId: string): Promise<Plan> {
        return store.readDb().planState.find((p) => p.workspaceId === workspaceId)?.plan ?? "Free";
      },
      async getPlanState(workspaceId) {
        const row = store.readDb().planState.find((p) => p.workspaceId === workspaceId);
        return { plan: row?.plan ?? "Free", status: row?.status ?? "trialing" };
      },
      async upsertPlanState(input) {
        const db = store.readDb();
        const existing = db.planState.find((p) => p.workspaceId === input.workspaceId);
        if (existing) {
          existing.plan = input.plan;
          existing.status = input.status;
          existing.externalCustomerId = input.externalCustomerId;
          existing.externalSubscriptionId = input.externalSubscriptionId;
          existing.updatedAt = now();
        } else {
          db.planState.push({ workspaceId: input.workspaceId, plan: input.plan, status: input.status, externalCustomerId: input.externalCustomerId, externalSubscriptionId: input.externalSubscriptionId, updatedAt: now() });
        }
        store.writeDb(db);
      }
    },
    feedback: {
      async create(input) {
        const db = store.readDb();
        db.feedback = db.feedback ?? [];
        const id = store.createId("fbk");
        db.feedback.push({
          id,
          workspaceId: input.workspaceId,
          createdBy: input.createdBy,
          actorType: input.actorType,
          actorId: input.actorId,
          category: input.category,
          severity: input.severity,
          summary: input.summary,
          details: input.details,
          page: input.page,
          systemId: input.systemId,
          userEmail: input.userEmail,
          status: "new",
          createdAt: now(),
          updatedAt: now()
        });
        store.writeDb(db);
        return { id };
      },
      async list(workspaceId, filter) {
        const db = store.readDb();
        const feedback = db.feedback ?? [];
        let rows = feedback.filter((item) => item.workspaceId === workspaceId);
        if (filter?.status) rows = rows.filter((item) => item.status === filter.status);
        if (filter?.category) rows = rows.filter((item) => item.category === filter.category);
        return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, filter?.limit ?? 100);
      },
      async updateStatus(input) {
        const db = store.readDb();
        db.feedback = db.feedback ?? [];
        const row = db.feedback.find((item) => item.workspaceId === input.workspaceId && item.id === input.id);
        if (!row) throw new Error("Feedback not found.");
        row.status = input.status;
        row.updatedAt = now();
        store.writeDb(db);
      }
    },
    agentTokens: {
      async create(input) {
        const id = store.createId("agt");
        const db = store.readDb();
        db.agentTokens.push({
          id,
          workspaceId: input.workspaceId,
          name: input.name,
          capabilities: input.capabilities,
          systemId: input.systemId,
          tokenHash: input.tokenHash,
          tokenPreview: input.tokenPreview,
          createdByUserId: input.createdByUserId,
          createdAt: now()
        });
        store.writeDb(db);
        return { id };
      },
      async list(workspaceId) {
        return store.readDb().agentTokens
          .filter((token) => token.workspaceId === workspaceId)
          .map((token) => ({
            id: token.id,
            name: token.name,
            capabilities: token.capabilities,
            systemId: token.systemId,
            tokenPreview: token.tokenPreview,
            createdByUserId: token.createdByUserId,
            createdAt: token.createdAt,
            lastUsedAt: token.lastUsedAt,
            revokedAt: token.revokedAt
          }));
      },
      async revoke(id) {
        const db = store.readDb();
        const token = db.agentTokens.find((row) => row.id === id);
        if (!token) throw new Error("Agent token not found.");
        token.revokedAt = now();
        store.writeDb(db);
      },
      async findByHash(tokenHash) {
        const token = store.readDb().agentTokens.find((row) => row.tokenHash === tokenHash) ?? null;
        if (!token) return null;
        return {
          id: token.id,
          workspaceId: token.workspaceId,
          name: token.name,
          capabilities: token.capabilities,
          systemId: token.systemId,
          createdByUserId: token.createdByUserId,
          revokedAt: token.revokedAt
        };
      },
      async touchLastUsed(id) {
        const db = store.readDb();
        const token = db.agentTokens.find((row) => row.id === id);
        if (!token) return;
        token.lastUsedAt = now();
        store.writeDb(db);
      }
    },
    audits: {
      async add(input) {
        const db = store.readDb();
        db.audits.push({
          id: store.createId("aud"),
          actorType: input.actorType,
          actorId: input.actorId,
          workspaceId: input.workspaceId,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          outcome: input.outcome,
          metadata: input.metadata,
          systemId: input.systemId,
          createdAt: now()
        });
        store.writeDb(db);
      },
      async list(workspaceId, filter) {
        const rows = store.readDb().audits
          .filter((audit) => audit.workspaceId === workspaceId)
          .filter((audit) => !filter?.actorType || audit.actorType === filter.actorType)
          .filter((audit) => !filter?.actorId || audit.actorId === filter.actorId)
          .filter((audit) => !filter?.actionPrefix || audit.action.startsWith(filter.actionPrefix))
          .filter((audit) => !filter?.systemId || audit.systemId === filter.systemId)
          .filter((audit) => !filter?.outcome || audit.outcome === filter.outcome)
          .filter((audit) => !filter?.since || new Date(audit.createdAt).getTime() >= new Date(filter.since).getTime())
          .filter((audit) => !filter?.until || new Date(audit.createdAt).getTime() <= new Date(filter.until).getTime())
          .filter((audit) => {
            if (!filter?.transport) return true;
            try {
              return JSON.parse(audit.metadata ?? "{}").transport === filter.transport;
            } catch {
              return false;
            }
          })
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, filter?.limit ?? 500)
          .map((audit) => ({
            id: audit.id,
            actorType: audit.actorType,
            actorId: audit.actorId,
            action: audit.action,
            targetType: audit.targetType,
            targetId: audit.targetId,
            outcome: audit.outcome,
            createdAt: audit.createdAt,
            systemId: audit.systemId,
            metadata: audit.metadata
          }));
        return rows;
      }
    },
    idempotency: {
      async get(input) {
        const row = store.readDb().idempotency.find((i) => i.workspaceId === input.workspaceId && i.actorId === input.actorId && i.route === input.route && i.key === input.key) ?? null;
        if (!row) return null;
        return { requestHash: row.requestHash, responseJson: row.responseJson, statusCode: row.statusCode };
      },
      async put(input) {
        const db = store.readDb();
        db.idempotency.push({ id: store.createId("idem"), ...input, createdAt: now() });
        store.writeDb(db);
      }
    },
    rateLimits: {
      async consume(input) {
        const db = store.readDb();
        const windowStart = new Date(Math.floor(new Date(input.now).getTime() / (input.windowSeconds * 1000)) * input.windowSeconds * 1000).toISOString();
        let row = db.rateLimits.find((r) => r.bucket === input.bucket && r.windowStart === windowStart);
        if (!row) {
          row = { id: store.createId("rte"), bucket: input.bucket, windowStart, count: 0, updatedAt: input.now };
          db.rateLimits.push(row);
        }
        row.count += 1;
        row.updatedAt = input.now;
        store.writeDb(db);
        const allowed = row.count <= input.limit;
        return { allowed, remaining: Math.max(0, input.limit - row.count), retryAfterSeconds: allowed ? 0 : input.windowSeconds };
      }
    },
    agentBuilder: {
      async createSession(input) {
        const db = store.readDb();
        const session = { id: store.createId("as"), workspaceId: input.workspaceId, systemId: input.systemId, title: input.title, createdBy: input.createdBy, createdAt: now(), updatedAt: now() };
        db.agentSessions.push(session);
        store.writeDb(db);
        return session;
      },
      async listSessions(input) {
        return store.readDb().agentSessions.filter((item) => item.workspaceId === input.workspaceId && (!input.systemId || item.systemId === input.systemId));
      },
      async createRun(input) {
        const db = store.readDb();
        const run = { id: store.createId("run"), sessionId: input.sessionId, workspaceId: input.workspaceId, systemId: input.systemId, status: "created" as const, userMessageId: input.userMessageId, createdAt: now(), updatedAt: now() };
        db.agentRuns.push(run);
        store.writeDb(db);
        return run;
      },
      async updateRun(input) {
        const db = store.readDb();
        const run = db.agentRuns.find((item) => item.id === input.runId);
        if (!run) return;
        run.status = input.status;
        run.startedAt = input.startedAt ?? run.startedAt;
        run.endedAt = input.endedAt ?? run.endedAt;
        run.error = input.error ?? run.error;
        run.updatedAt = now();
        store.writeDb(db);
      },
      async getRun(runId) {
        return store.readDb().agentRuns.find((item) => item.id === runId) ?? null;
      },
      async addMessage(input) {
        const db = store.readDb();
        const message = { id: store.createId("msg"), sessionId: input.sessionId, runId: input.runId, workspaceId: input.workspaceId, systemId: input.systemId, role: input.role, body: input.body, createdAt: now() };
        db.runMessages.push(message);
        store.writeDb(db);
        return message;
      },
      async listMessages(input) {
        return store.readDb().runMessages.filter((item) => item.sessionId === input.sessionId);
      },
      async addEvent(input) {
        const db = store.readDb();
        const event = { ...input, id: store.createId("evt") };
        db.runEvents.push(event);
        store.writeDb(db);
        return event;
      },
      async listRunEvents(input) {
        return store.readDb().runEvents.filter((item) => (!input.runId || item.runId === input.runId) && (!input.sessionId || item.sessionId === input.sessionId)).sort((a, b) => a.sequence - b.sequence);
      },
      async addProposal(input) {
        const db = store.readDb();
        const row = { ...input, id: store.createId("prop") };
        db.graphActionProposals.push(row);
        store.writeDb(db);
        return row;
      },
      async listProposals(input) {
        return store.readDb().graphActionProposals
          .filter((item) => (!input.runId || item.runId === input.runId) && (!input.systemId || item.targetSystemId === input.systemId) && (!input.status || item.status === input.status))
          .sort((a, b) => a.sequence - b.sequence);
      },
      async updateProposal(input) {
        const db = store.readDb();
        const row = db.graphActionProposals.find((item) => item.id === input.proposalId);
        if (!row) return;
        row.status = input.status;
        row.appliedAt = input.appliedAt ?? row.appliedAt;
        row.reviewDecision = input.reviewDecision ?? row.reviewDecision;
        row.error = input.error ?? row.error;
        store.writeDb(db);
      },
      async getProposal(proposalId) {
        return store.readDb().graphActionProposals.find((item) => item.id === proposalId) ?? null;
      },
      async addAppliedAction(input) {
        const db = store.readDb();
        const row = { ...input, id: store.createId("applied") };
        db.appliedGraphActions.push(row);
        store.writeDb(db);
        return row;
      },
      async listAppliedActions(input) {
        return store.readDb().appliedGraphActions.filter((item) => (!input.runId || item.runId === input.runId) && (!input.systemId || item.targetSystemId === input.systemId));
      },
      async upsertPlan(input) {
        const db = store.readDb();
        const existing = input.planId ? db.runPlans.find((row) => row.id === input.planId) : db.runPlans.find((row) => row.runId === input.runId);
        if (existing) {
          existing.summary = input.summary;
          existing.status = input.status;
          existing.confidence = input.confidence;
          existing.requiresApproval = input.requiresApproval;
          existing.steps = input.steps;
          existing.updatedAt = now();
          store.writeDb(db);
          return existing;
        }
        const row = { id: store.createId("plan"), runId: input.runId, workspaceId: input.workspaceId, systemId: input.systemId, summary: input.summary, status: input.status, confidence: input.confidence, requiresApproval: input.requiresApproval, steps: input.steps, createdAt: now(), updatedAt: now() };
        db.runPlans.push(row);
        store.writeDb(db);
        return row;
      },
      async getPlan(runId) {
        return store.readDb().runPlans.find((row) => row.runId === runId) ?? null;
      },
      async addToolCall(input) {
        const db = store.readDb();
        const row = { ...input, id: store.createId("tool") };
        db.toolCalls.push(row);
        store.writeDb(db);
        return row;
      },
      async listToolCalls(input) {
        return store.readDb().toolCalls.filter((row) => row.runId === input.runId);
      },
      async addApprovalRequest(input) {
        const db = store.readDb();
        const row = { ...input, id: store.createId("apr") };
        db.approvalRequests.push(row);
        store.writeDb(db);
        return row;
      },
      async listApprovalRequests(input) {
        return store.readDb().approvalRequests.filter((row) => (!input.runId || row.runId === input.runId) && (!input.systemId || row.systemId === input.systemId) && (!input.status || row.status === input.status));
      },
      async getApprovalRequest(id) {
        return store.readDb().approvalRequests.find((row) => row.id === id) ?? null;
      },
      async updateApprovalRequest(input) {
        const db = store.readDb();
        const row = db.approvalRequests.find((item) => item.id === input.requestId);
        if (!row) return;
        row.status = input.status;
        row.decidedAt = input.decidedAt ?? row.decidedAt;
        row.decidedBy = input.decidedBy ?? row.decidedBy;
        row.decisionNote = input.decisionNote ?? row.decisionNote;
        store.writeDb(db);
      }
    }
  };
}
