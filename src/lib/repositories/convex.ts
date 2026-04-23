import { api } from "../../../convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex/httpClient";
import {
  convexAddCollaborator,
  convexAddComment,
  convexAddNode,
  convexAddPipe,
  convexAddVersion,
  convexArchiveSystem,
  convexCreateSystem,
  convexDeleteNode,
  convexDeletePipe,
  convexListSystems,
  convexSystemBundle,
  convexUpdateNode,
  convexUpsertPresence
} from "@/lib/convex/modeApi";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

export function createConvexRepositories(): RepositorySet {
  return {
    users: {
      async provision(identity): Promise<AppContext> {
        const convex = getConvexHttpClient();
        const result = await convex.mutation(api.app.provisionUser, identity as never);
        return {
          userId: String(result.user?._id),
          workspaceId: String(result.membership?.workspaceId),
          role: (result.membership?.role ?? "Owner") as never,
          plan: "Free",
          actorType: "user",
          actorId: String(result.user?._id)
        };
      },
      async findByEmail() {
        return null;
      }
    },
    workspaces: {
      async getPlan(workspaceId) {
        const client = getConvexHttpClient();
        const row = await client.query(api.app.getPlanState, { workspaceId: workspaceId as never });
        return row?.plan ?? "Free";
      }
    },
    memberships: {
      async add(workspaceId, userId, role) {
        await convexAddCollaborator(workspaceId, userId, "", role);
      },
      async list(workspaceId) {
        const client = getConvexHttpClient();
        const rows = await client.query(api.app.listWorkspaceMembers, { workspaceId: workspaceId as never });
        return rows.map((r: any) => ({ userId: String(r.userId), role: r.role }));
      },
      async updateRole(workspaceId, userId, role) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.updateMemberRole, { workspaceId: workspaceId as never, userId: userId as never, role });
      }
    },
    systems: {
      async list(workspaceId) {
        const rows = await convexListSystems(workspaceId);
        return rows.map((s: any) => ({ id: String(s._id), workspaceId: String(s.workspaceId), name: s.name, description: s.description, createdBy: String(s.createdBy), createdAt: s.createdAt, updatedAt: s.updatedAt, archivedAt: s.archivedAt }));
      },
      async create(input) {
        const id = await convexCreateSystem(input.workspaceId, input.userId, input.name, input.description);
        return String(id);
      },
      async getBundle(systemId) {
        const data = await convexSystemBundle(systemId);
        return {
          system: { id: String(data.system._id), workspaceId: String(data.system.workspaceId), name: data.system.name, description: data.system.description, createdBy: String(data.system.createdBy), createdAt: data.system.createdAt, updatedAt: data.system.updatedAt, archivedAt: data.system.archivedAt },
          nodes: data.nodes.map((n: any) => ({ id: String(n._id), systemId: String(n.systemId), type: n.type, title: n.title, description: n.description, position: n.position, portIds: n.portIds ?? [] })),
          pipes: data.pipes.map((p: any) => ({ id: String(p._id), systemId: String(p.systemId), fromPortId: p.fromPortId, toPortId: p.toPortId, fromNodeId: String(p.fromNodeId), toNodeId: String(p.toNodeId) })),
          comments: data.comments.map((c: any) => ({ id: String(c._id), systemId: String(c.systemId), authorId: String(c.authorId), body: c.body, nodeId: c.nodeId ? String(c.nodeId) : undefined, createdAt: c.createdAt })),
          versions: data.versions.map((v: any) => ({ id: String(v._id), systemId: String(v.systemId), name: v.name, authorId: String(v.authorId), createdAt: v.createdAt, snapshot: v.snapshot })),
          presence: data.presence.map((p: any) => ({ id: String(p._id), systemId: String(p.systemId), userId: String(p.userId), name: String(p.userId), selectedNodeId: p.selectedNodeId ? String(p.selectedNodeId) : undefined, editingTarget: p.editingTarget, cursor: p.cursor, updatedAt: p.updatedAt }))
        };
      },
      async archive(systemId) {
        await convexArchiveSystem(systemId);
      },
      async restore(systemId) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.restoreSystem, { systemId: systemId as never });
      }
    },
    graph: {
      async addNode(input) {
        const id = await convexAddNode(input.systemId, input.type, input.title, input.description, input.x, input.y);
        return String(id);
      },
      async updateNode(input) {
        await convexUpdateNode(input.nodeId, input.title, input.description, input.position);
      },
      async deleteNode(nodeId) {
        await convexDeleteNode(nodeId);
      },
      async addPipe(input) {
        const bundle = await convexSystemBundle(input.systemId);
        const fromNode = bundle.nodes.find((n: any) => String(n._id) === input.fromNodeId);
        const toNode = bundle.nodes.find((n: any) => String(n._id) === input.toNodeId);
        const id = await convexAddPipe(input.systemId, input.fromNodeId, fromNode?.portIds?.[1] ?? `${input.fromNodeId}_out`, input.toNodeId, toNode?.portIds?.[0] ?? `${input.toNodeId}_in`);
        return String(id);
      },
      async deletePipe(pipeId) {
        await convexDeletePipe(pipeId);
      }
    },
    comments: {
      async add(input) {
        await convexAddComment(input.systemId, input.authorId, input.body, input.nodeId);
      }
    },
    versions: {
      async list(systemId) {
        const bundle = await convexSystemBundle(systemId);
        return bundle.versions.map((v: any) => ({ id: String(v._id), systemId: String(v.systemId), name: v.name, authorId: String(v.authorId), createdAt: v.createdAt, snapshot: v.snapshot }));
      },
      async add(input) {
        await convexAddVersion(input.systemId, input.authorId, input.name, input.snapshot);
      },
      async get(systemId, versionId) {
        const versions = await this.list(systemId);
        return versions.find((v) => v.id === versionId) ?? null;
      },
      async restoreSnapshot() {
        throw new Error("Version restore is currently supported in mock mode only.");
      }
    },
    invites: {
      async add(input) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.createInvite, { workspaceId: input.workspaceId as never, invitedBy: input.invitedBy as never, email: input.email, role: input.role, token: input.token, expiresAt: input.expiresAt });
      },
      async list(workspaceId) {
        const client = getConvexHttpClient();
        const rows = await client.query(api.app.listInvites, { workspaceId: workspaceId as never });
        return rows.map((r: any) => ({ token: r.token, email: r.email, role: r.role, status: r.status, expiresAt: r.expiresAt }));
      },
      async getByToken(token) {
        const client = getConvexHttpClient();
        const row = await client.query(api.app.getInviteByToken, { token });
        if (!row) return null;
        return { workspaceId: String(row.workspaceId), token: row.token, email: row.email, role: row.role, status: row.status, expiresAt: row.expiresAt };
      },
      async accept(token, userId) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.acceptInvite, { token, userId: userId as never });
      },
      async cancel(token) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.cancelInvite, { token });
      }
    },
    entitlements: {
      async getPlan(workspaceId) {
        const client = getConvexHttpClient();
        const row = await client.query(api.app.getPlanState, { workspaceId: workspaceId as never });
        return row?.plan ?? "Free";
      },
      async getPlanState(workspaceId) {
        const client = getConvexHttpClient();
        const row = await client.query(api.app.getPlanState, { workspaceId: workspaceId as never });
        return { plan: row?.plan ?? "Free", status: row?.status ?? "trialing" };
      },
      async upsertPlanState(input) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.upsertPlanState, { workspaceId: input.workspaceId as never, plan: input.plan, status: input.status, externalCustomerId: input.externalCustomerId, externalSubscriptionId: input.externalSubscriptionId });
      }
    },
    feedback: {
      async create(input) {
        const client = getConvexHttpClient();
        const id = await client.mutation((api as any).app.createFeedbackItem, {
          workspaceId: input.workspaceId as never,
          createdBy: input.createdBy as never,
          actorType: input.actorType,
          actorId: input.actorId,
          category: input.category,
          severity: input.severity,
          summary: input.summary,
          details: input.details,
          page: input.page,
          systemId: input.systemId as never,
          userEmail: input.userEmail
        });
        return { id: String(id) };
      },
      async list(workspaceId, filter) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listFeedbackItems, { workspaceId: workspaceId as never });
        return rows
          .filter((row: any) => !filter?.status || row.status === filter.status)
          .filter((row: any) => !filter?.category || row.category === filter.category)
          .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, filter?.limit ?? 100)
          .map((row: any) => ({
            id: String(row._id),
            workspaceId: String(row.workspaceId),
            createdBy: String(row.createdBy),
            actorType: row.actorType,
            actorId: row.actorId,
            category: row.category,
            severity: row.severity,
            summary: row.summary,
            details: row.details,
            page: row.page,
            systemId: row.systemId ? String(row.systemId) : undefined,
            userEmail: row.userEmail,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          }));
      },
      async updateStatus(input) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.updateFeedbackStatus, {
          workspaceId: input.workspaceId as never,
          id: input.id as never,
          status: input.status,
          updatedBy: input.updatedBy as never
        });
      }
    },
    presence: {
      async upsert(input) {
        await convexUpsertPresence(input.systemId, input.userId, input.sessionId, input.selectedNodeId, input.editingTarget, input.cursor);
      },
      async list(systemId) {
        const bundle = await convexSystemBundle(systemId);
        return bundle.presence.map((p: any) => ({ id: String(p._id), systemId: String(p.systemId), userId: String(p.userId), name: String(p.userId), selectedNodeId: p.selectedNodeId ? String(p.selectedNodeId) : undefined, editingTarget: p.editingTarget, cursor: p.cursor, updatedAt: p.updatedAt }));
      }
    },
    agentTokens: {
      async create(input) {
        const client = getConvexHttpClient();
        const id = await client.mutation(api.app.createAgentToken, {
          workspaceId: input.workspaceId as never,
          name: input.name,
          capabilities: input.capabilities,
          systemId: input.systemId as never,
          tokenHash: input.tokenHash,
          tokenPreview: input.tokenPreview,
          createdByUserId: input.createdByUserId as never
        });
        return { id: String(id) };
      },
      async list(workspaceId) {
        const client = getConvexHttpClient();
        const rows = await client.query(api.app.listAgentTokens, { workspaceId: workspaceId as never });
        return rows.map((row: any) => ({
          id: String(row._id),
          name: row.name,
          capabilities: row.capabilities ?? [],
          systemId: row.systemId ? String(row.systemId) : undefined,
          tokenPreview: row.tokenPreview,
          createdByUserId: String(row.createdByUserId),
          createdAt: row.createdAt,
          lastUsedAt: row.lastUsedAt,
          revokedAt: row.revokedAt
        }));
      },
      async revoke(id) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.revokeAgentToken, { tokenId: id as never });
      },
      async findByHash(tokenHash) {
        const client = getConvexHttpClient();
        const row = await client.query(api.app.getAgentTokenByHash, { tokenHash });
        if (!row) return null;
        return {
          id: String(row._id),
          workspaceId: String(row.workspaceId),
          name: row.name,
          capabilities: row.capabilities ?? [],
          systemId: row.systemId ? String(row.systemId) : undefined,
          createdByUserId: String(row.createdByUserId),
          revokedAt: row.revokedAt
        };
      },
      async touchLastUsed(id) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.touchAgentToken, { tokenId: id as never });
      }
    },
    audits: {
      async add(input) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.addAuditEvent, {
          actorType: input.actorType,
          actorId: input.actorId,
          workspaceId: input.workspaceId as never,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          outcome: input.outcome,
          metadata: input.metadata,
          systemId: input.systemId as never
        });
      },
      async list(workspaceId, filter) {
        const client = getConvexHttpClient();
        const rows = await client.query(api.app.listAuditEvents, { workspaceId: workspaceId as never });
        return rows
          .filter((row: any) => !filter?.actorType || row.actorType === filter.actorType)
          .filter((row: any) => !filter?.actorId || row.actorId === filter.actorId)
          .filter((row: any) => !filter?.actionPrefix || String(row.action).startsWith(filter.actionPrefix))
          .filter((row: any) => !filter?.systemId || String(row.systemId ?? "") === filter.systemId)
          .filter((row: any) => !filter?.outcome || row.outcome === filter.outcome)
          .filter((row: any) => !filter?.since || new Date(row.createdAt).getTime() >= new Date(filter.since).getTime())
          .filter((row: any) => !filter?.until || new Date(row.createdAt).getTime() <= new Date(filter.until).getTime())
          .filter((row: any) => {
            if (!filter?.transport) return true;
            try {
              return JSON.parse(row.metadata ?? "{}").transport === filter.transport;
            } catch {
              return false;
            }
          })
          .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, filter?.limit ?? 500)
          .map((row: any) => ({
          id: String(row._id),
          actorType: row.actorType,
          actorId: row.actorId,
          action: row.action,
          targetType: row.targetType,
          targetId: row.targetId,
          outcome: row.outcome,
          createdAt: row.createdAt,
          systemId: row.systemId ? String(row.systemId) : undefined,
          metadata: row.metadata
        }));
      }
    },
    idempotency: {
      async get(input) {
        const client = getConvexHttpClient();
        const row = await client.query(api.app.getIdempotencyKey, {
          workspaceId: input.workspaceId as never,
          actorId: input.actorId,
          route: input.route,
          key: input.key
        });
        if (!row) return null;
        return { requestHash: row.requestHash, responseJson: row.responseJson, statusCode: row.statusCode };
      },
      async put(input) {
        const client = getConvexHttpClient();
        await client.mutation(api.app.putIdempotencyKey, {
          workspaceId: input.workspaceId as never,
          actorId: input.actorId,
          route: input.route,
          key: input.key,
          requestHash: input.requestHash,
          responseJson: input.responseJson,
          statusCode: input.statusCode
        });
      }
    },
    rateLimits: {
      async consume(input) {
        const client = getConvexHttpClient();
        const windowStart = new Date(Math.floor(new Date(input.now).getTime() / (input.windowSeconds * 1000)) * input.windowSeconds * 1000).toISOString();
        const count = await client.mutation(api.app.consumeRateLimit, { bucket: input.bucket, windowStart });
        const allowed = count <= input.limit;
        return { allowed, remaining: Math.max(0, input.limit - count), retryAfterSeconds: allowed ? 0 : input.windowSeconds };
      }
    },
    agentBuilder: {
      async createSession(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.createAgentSession, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, title: input.title, createdBy: input.createdBy as never });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, title: row.title, createdBy: String(row.createdBy), createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async listSessions(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listAgentSessions, { workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, title: row.title, createdBy: String(row.createdBy), createdAt: row.createdAt, updatedAt: row.updatedAt }));
      },
      async createRun(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.createAgentRun, { sessionId: input.sessionId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, userMessageId: input.userMessageId as never });
        return { id: String(row._id), sessionId: String(row.sessionId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, status: row.status, userMessageId: String(row.userMessageId), startedAt: row.startedAt, endedAt: row.endedAt, error: row.error, createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async updateRun(input) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.patchAgentRun, { runId: input.runId as never, status: input.status, startedAt: input.startedAt, endedAt: input.endedAt, error: input.error });
      },
      async getRun(runId) {
        const client = getConvexHttpClient();
        const row = await client.query((api as any).app.getAgentRun, { runId: runId as never });
        if (!row) return null;
        return { id: String(row._id), sessionId: String(row.sessionId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, status: row.status, userMessageId: String(row.userMessageId), startedAt: row.startedAt, endedAt: row.endedAt, error: row.error, createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async addMessage(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addAgentMessage, { sessionId: input.sessionId as never, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, role: input.role, body: input.body });
        return { id: String(row._id), sessionId: String(row.sessionId), runId: row.runId ? String(row.runId) : undefined, workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, role: row.role, body: row.body, createdAt: row.createdAt };
      },
      async listMessages(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listAgentMessages, { sessionId: input.sessionId as never });
        return rows.map((row: any) => ({ id: String(row._id), sessionId: String(row.sessionId), runId: row.runId ? String(row.runId) : undefined, workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, role: row.role, body: row.body, createdAt: row.createdAt }));
      },
      async addEvent(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addAgentRunEvent, { ...input, sessionId: input.sessionId as never, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, metadata: input.metadata ? JSON.stringify(input.metadata) : undefined });
        return { id: String(row._id), sessionId: String(row.sessionId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, type: row.type, at: row.at, sequence: row.sequence, text: row.text, status: row.status, metadata: row.metadata ? JSON.parse(row.metadata) : undefined };
      },
      async listRunEvents(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listAgentRunEvents, { runId: input.runId as never, sessionId: input.sessionId as never });
        return rows.map((row: any) => ({ id: String(row._id), sessionId: String(row.sessionId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, type: row.type, at: row.at, sequence: row.sequence, text: row.text, status: row.status, metadata: row.metadata ? JSON.parse(row.metadata) : undefined }));
      },

      async addProposal(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addGraphActionProposal, { ...input, runId: input.runId as never, sessionId: input.sessionId as never, workspaceId: input.workspaceId as never, targetSystemId: input.targetSystemId as never, payload: JSON.stringify(input.payload), reviewDecision: input.reviewDecision ? JSON.stringify(input.reviewDecision) : undefined });
        return { id: String(row._id), runId: String(row.runId), sessionId: String(row.sessionId), workspaceId: String(row.workspaceId), targetSystemId: String(row.targetSystemId), actionId: row.actionId, actionType: row.actionType, actor: { actorType: row.actorType, actorId: row.actorId, workspaceId: String(row.workspaceId) }, payload: JSON.parse(row.payload), rationale: row.rationale, riskClass: row.riskClass, applyMode: row.applyMode, sequence: row.sequence, validationStatus: row.validationStatus, status: row.status, proposedAt: row.proposedAt, appliedAt: row.appliedAt, reviewDecision: row.reviewDecision ? JSON.parse(row.reviewDecision) : undefined, error: row.error };
      },
      async listProposals(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listGraphActionProposals, { runId: input.runId as never, systemId: input.systemId as never, status: input.status });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), sessionId: String(row.sessionId), workspaceId: String(row.workspaceId), targetSystemId: String(row.targetSystemId), actionId: row.actionId, actionType: row.actionType, actor: { actorType: row.actorType, actorId: row.actorId, workspaceId: String(row.workspaceId) }, payload: JSON.parse(row.payload), rationale: row.rationale, riskClass: row.riskClass, applyMode: row.applyMode, sequence: row.sequence, validationStatus: row.validationStatus, status: row.status, proposedAt: row.proposedAt, appliedAt: row.appliedAt, reviewDecision: row.reviewDecision ? JSON.parse(row.reviewDecision) : undefined, error: row.error }));
      },
      async updateProposal(input) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.patchGraphActionProposal, { proposalId: input.proposalId as never, status: input.status, appliedAt: input.appliedAt, reviewDecision: input.reviewDecision ? JSON.stringify(input.reviewDecision) : undefined, error: input.error });
      },
      async getProposal(proposalId) {
        const client = getConvexHttpClient();
        const row = await client.query((api as any).app.getGraphActionProposal, { proposalId: proposalId as never });
        if (!row) return null;
        return { id: String(row._id), runId: String(row.runId), sessionId: String(row.sessionId), workspaceId: String(row.workspaceId), targetSystemId: String(row.targetSystemId), actionId: row.actionId, actionType: row.actionType, actor: { actorType: row.actorType, actorId: row.actorId, workspaceId: String(row.workspaceId) }, payload: JSON.parse(row.payload), rationale: row.rationale, riskClass: row.riskClass, applyMode: row.applyMode, sequence: row.sequence, validationStatus: row.validationStatus, status: row.status, proposedAt: row.proposedAt, appliedAt: row.appliedAt, reviewDecision: row.reviewDecision ? JSON.parse(row.reviewDecision) : undefined, error: row.error };
      },
      async addAppliedAction(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addAppliedGraphAction, { ...input, proposalId: input.proposalId as never, runId: input.runId as never, sessionId: input.sessionId as never, workspaceId: input.workspaceId as never, targetSystemId: input.targetSystemId as never, versionCheckpointId: input.versionCheckpointId as never });
        return { id: String(row._id), proposalId: String(row.proposalId), runId: String(row.runId), sessionId: String(row.sessionId), workspaceId: String(row.workspaceId), targetSystemId: String(row.targetSystemId), actionType: row.actionType, appliedAt: row.appliedAt, validationIssueCount: row.validationIssueCount, versionCheckpointId: row.versionCheckpointId ? String(row.versionCheckpointId) : undefined };
      },
      async listAppliedActions(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listAppliedGraphActions, { runId: input.runId as never, systemId: input.systemId as never });
        return rows.map((row: any) => ({ id: String(row._id), proposalId: String(row.proposalId), runId: String(row.runId), sessionId: String(row.sessionId), workspaceId: String(row.workspaceId), targetSystemId: String(row.targetSystemId), actionType: row.actionType, appliedAt: row.appliedAt, validationIssueCount: row.validationIssueCount, versionCheckpointId: row.versionCheckpointId ? String(row.versionCheckpointId) : undefined }));
      },
      async upsertPlan(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.upsertRunPlan, { planId: input.planId as never, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, summary: input.summary, status: input.status, confidence: input.confidence, requiresApproval: input.requiresApproval, stepsJson: JSON.stringify(input.steps) });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), summary: row.summary, status: row.status, confidence: row.confidence, requiresApproval: row.requiresApproval, steps: JSON.parse(row.stepsJson), createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async getPlan(runId) {
        const client = getConvexHttpClient();
        const row = await client.query((api as any).app.getRunPlan, { runId: runId as never });
        if (!row) return null;
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), summary: row.summary, status: row.status, confidence: row.confidence, requiresApproval: row.requiresApproval, steps: JSON.parse(row.stepsJson), createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async addToolCall(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addToolCall, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), toolName: row.toolName, inputJson: row.inputJson, outputJson: row.outputJson, status: row.status, error: row.error, startedAt: row.startedAt, completedAt: row.completedAt };
      },
      async listToolCalls(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listToolCalls, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), toolName: row.toolName, inputJson: row.inputJson, outputJson: row.outputJson, status: row.status, error: row.error, startedAt: row.startedAt, completedAt: row.completedAt }));
      },
      async addApprovalRequest(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addApprovalRequest, { ...input, runId: input.runId as never, proposalId: input.proposalId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, decidedBy: input.decidedBy as never });
        return { id: String(row._id), runId: String(row.runId), proposalId: String(row.proposalId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), targetType: row.targetType, targetRef: row.targetRef, reason: row.reason, status: row.status, decisionNote: row.decisionNote, requestedAt: row.requestedAt, decidedAt: row.decidedAt, decidedBy: row.decidedBy ? String(row.decidedBy) : undefined };
      },
      async listApprovalRequests(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listApprovalRequests, { runId: input.runId as never, systemId: input.systemId as never, status: input.status });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), proposalId: String(row.proposalId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), targetType: row.targetType, targetRef: row.targetRef, reason: row.reason, status: row.status, decisionNote: row.decisionNote, requestedAt: row.requestedAt, decidedAt: row.decidedAt, decidedBy: row.decidedBy ? String(row.decidedBy) : undefined }));
      },
      async getApprovalRequest(id) {
        const client = getConvexHttpClient();
        const row = await client.query((api as any).app.getApprovalRequest, { requestId: id as never });
        if (!row) return null;
        return { id: String(row._id), runId: String(row.runId), proposalId: String(row.proposalId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), targetType: row.targetType, targetRef: row.targetRef, reason: row.reason, status: row.status, decisionNote: row.decisionNote, requestedAt: row.requestedAt, decidedAt: row.decidedAt, decidedBy: row.decidedBy ? String(row.decidedBy) : undefined };
      },
      async updateApprovalRequest(input) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.patchApprovalRequest, { requestId: input.requestId as never, status: input.status, decidedAt: input.decidedAt, decidedBy: input.decidedBy as never, decisionNote: input.decisionNote });
      },
      async addStageRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addRunStageRecord, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, status: row.status, summary: row.summary, at: row.at };
      },
      async listStageRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listRunStageRecords, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, status: row.status, summary: row.summary, at: row.at }));
      },
      async addPlanRevision(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addPlanRevision, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, assumptionsJson: JSON.stringify(input.assumptions), openQuestionsJson: JSON.stringify(input.openQuestions), unresolvedRisksJson: JSON.stringify(input.unresolvedRisks), recommendedNextStepsJson: JSON.stringify(input.recommendedNextSteps) });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), version: row.version, summary: row.summary, critique: row.critique, assumptions: JSON.parse(row.assumptionsJson), openQuestions: JSON.parse(row.openQuestionsJson), unresolvedRisks: JSON.parse(row.unresolvedRisksJson), recommendedNextSteps: JSON.parse(row.recommendedNextStepsJson), createdAt: row.createdAt };
      },
      async listPlanRevisions(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listPlanRevisions, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), version: row.version, summary: row.summary, critique: row.critique, assumptions: JSON.parse(row.assumptionsJson), openQuestions: JSON.parse(row.openQuestionsJson), unresolvedRisks: JSON.parse(row.unresolvedRisksJson), recommendedNextSteps: JSON.parse(row.recommendedNextStepsJson), createdAt: row.createdAt }));
      },
      async addRoleActivity(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addRoleActivity, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, role: row.role, summary: row.summary, startedAt: row.startedAt, completedAt: row.completedAt };
      },
      async listRoleActivities(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listRoleActivities, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, role: row.role, summary: row.summary, startedAt: row.startedAt, completedAt: row.completedAt }));
      },
      async addProposalBatch(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addProposalBatch, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, proposalIdsJson: JSON.stringify(input.proposalIds) });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, summary: row.summary, rationale: row.rationale, proposalIds: JSON.parse(row.proposalIdsJson), status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt, reviewerNote: row.reviewerNote };
      },
      async updateProposalBatch(input) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.patchProposalBatch, { batchId: input.batchId as never, status: input.status, updatedAt: input.updatedAt, reviewerNote: input.reviewerNote });
      },
      async listProposalBatches(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listProposalBatches, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, summary: row.summary, rationale: row.rationale, proposalIds: JSON.parse(row.proposalIdsJson), status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt, reviewerNote: row.reviewerNote }));
      },
      async addSubAgentTask(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addSubAgentTask, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, contextPackJson: JSON.stringify(input.contextPack) });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, role: row.role, skillId: row.skillId, title: row.title, contextPack: JSON.parse(row.contextPackJson), status: row.status, createdAt: row.createdAt, startedAt: row.startedAt, completedAt: row.completedAt, error: row.error };
      },
      async updateSubAgentTask(input) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.patchSubAgentTask, { taskId: input.taskId as never, status: input.status, startedAt: input.startedAt, completedAt: input.completedAt, error: input.error });
      },
      async listSubAgentTasks(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listSubAgentTasks, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, role: row.role, skillId: row.skillId, title: row.title, contextPack: JSON.parse(row.contextPackJson), status: row.status, createdAt: row.createdAt, startedAt: row.startedAt, completedAt: row.completedAt, error: row.error }));
      },
      async addSubAgentResult(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addSubAgentResult, { ...input, taskId: input.taskId as never, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, proposedActionTypesJson: JSON.stringify(input.proposedActionTypes), openQuestionsJson: JSON.stringify(input.openQuestions), conflictSignalsJson: JSON.stringify(input.conflictSignals) });
        return { id: String(row._id), taskId: String(row.taskId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), planSummary: row.planSummary, critique: row.critique, proposedActionTypes: JSON.parse(row.proposedActionTypesJson), openQuestions: JSON.parse(row.openQuestionsJson), conflictSignals: JSON.parse(row.conflictSignalsJson), createdAt: row.createdAt };
      },
      async listSubAgentResults(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listSubAgentResults, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), taskId: String(row.taskId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), planSummary: row.planSummary, critique: row.critique, proposedActionTypes: JSON.parse(row.proposedActionTypesJson), openQuestions: JSON.parse(row.openQuestionsJson), conflictSignals: JSON.parse(row.conflictSignalsJson), createdAt: row.createdAt }));
      },
      async addSkillInvocation(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addSkillInvocation, { ...input, taskId: input.taskId as never, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return { id: String(row._id), taskId: String(row.taskId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), skillId: row.skillId, inputSummary: row.inputSummary, status: row.status, outputSummary: row.outputSummary, createdAt: row.createdAt, completedAt: row.completedAt };
      },
      async listSkillInvocations(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listSkillInvocations, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), taskId: String(row.taskId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), skillId: row.skillId, inputSummary: row.inputSummary, status: row.status, outputSummary: row.outputSummary, createdAt: row.createdAt, completedAt: row.completedAt }));
      },
      async addOrchestrationStep(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addOrchestrationStep, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, decision: row.decision, summary: row.summary, at: row.at };
      },
      async listOrchestrationSteps(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listOrchestrationSteps, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), stage: row.stage, decision: row.decision, summary: row.summary, at: row.at }));
      },
      async addReconciliationRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addReconciliationRecord, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, inputTaskIdsJson: JSON.stringify(input.inputTaskIds) });
        return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), inputTaskIds: JSON.parse(row.inputTaskIdsJson), decision: row.decision, summary: row.summary, createdAt: row.createdAt };
      },
      async listReconciliationRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listReconciliationRecords, { runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), inputTaskIds: JSON.parse(row.inputTaskIdsJson), decision: row.decision, summary: row.summary, createdAt: row.createdAt }));
      },
      async addEvaluationRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addEvaluationRecord, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never, scoreJson: JSON.stringify(input.score), signalsJson: JSON.stringify(input.signals) });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, runId: row.runId ? String(row.runId) : undefined, scope: row.scope, type: row.type, status: row.status, score: JSON.parse(row.scoreJson), outcome: row.outcome, rationale: row.rationale, signals: JSON.parse(row.signalsJson), subjectRef: row.subjectRef, createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async listEvaluationRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listEvaluationRecords, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never, scope: input.scope });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, runId: row.runId ? String(row.runId) : undefined, scope: row.scope, type: row.type, status: row.status, score: JSON.parse(row.scoreJson), outcome: row.outcome, rationale: row.rationale, signals: JSON.parse(row.signalsJson), subjectRef: row.subjectRef, createdAt: row.createdAt, updatedAt: row.updatedAt }));
      },
      async addStrategyPerformanceRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addStrategyPerformanceRecord, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never, strategyId: input.strategyId as never });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, strategyId: String(row.strategyId), strategyName: row.strategyName, runId: String(row.runId), acceptanceRate: row.acceptanceRate, validationScore: row.validationScore, reviewFriction: row.reviewFriction, overallScore: row.overallScore, notes: row.notes, createdAt: row.createdAt };
      },
      async listStrategyPerformanceRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listStrategyPerformanceRecords, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, strategyId: input.strategyId as never, runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, strategyId: String(row.strategyId), strategyName: row.strategyName, runId: String(row.runId), acceptanceRate: row.acceptanceRate, validationScore: row.validationScore, reviewFriction: row.reviewFriction, overallScore: row.overallScore, notes: row.notes, createdAt: row.createdAt }));
      },
      async addSkillPerformanceRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addSkillPerformanceRecord, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), runId: String(row.runId), skillId: row.skillId, role: row.role, successRate: row.successRate, acceptedBatchRate: row.acceptedBatchRate, validationImpact: row.validationImpact, overallScore: row.overallScore, notes: row.notes, createdAt: row.createdAt };
      },
      async listSkillPerformanceRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listSkillPerformanceRecords, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never, skillId: input.skillId });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), runId: String(row.runId), skillId: row.skillId, role: row.role, successRate: row.successRate, acceptedBatchRate: row.acceptedBatchRate, validationImpact: row.validationImpact, overallScore: row.overallScore, notes: row.notes, createdAt: row.createdAt }));
      },
      async addPatternPromotionRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addPatternPromotionRecord, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), patternArtifactId: row.patternArtifactId, reason: row.reason, evidenceScore: row.evidenceScore, createdAt: row.createdAt };
      },
      async listPatternPromotionRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listPatternPromotionRecords, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, patternArtifactId: input.patternArtifactId });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), patternArtifactId: row.patternArtifactId, reason: row.reason, evidenceScore: row.evidenceScore, createdAt: row.createdAt }));
      },
      async addPatternDemotionRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addPatternDemotionRecord, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), patternArtifactId: row.patternArtifactId, reason: row.reason, evidenceScore: row.evidenceScore, createdAt: row.createdAt };
      },
      async listPatternDemotionRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listPatternDemotionRecords, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, patternArtifactId: input.patternArtifactId });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), patternArtifactId: row.patternArtifactId, reason: row.reason, evidenceScore: row.evidenceScore, createdAt: row.createdAt }));
      },
      async addLearningArtifact(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addLearningArtifact, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never, sourceEvaluationIdsJson: JSON.stringify(input.sourceEvaluationIds) });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, runId: row.runId ? String(row.runId) : undefined, type: row.type, title: row.title, summary: row.summary, confidence: row.confidence, sourceEvaluationIds: JSON.parse(row.sourceEvaluationIdsJson), createdAt: row.createdAt };
      },
      async listLearningArtifacts(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listLearningArtifacts, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, runId: row.runId ? String(row.runId) : undefined, type: row.type, title: row.title, summary: row.summary, confidence: row.confidence, sourceEvaluationIds: JSON.parse(row.sourceEvaluationIdsJson), createdAt: row.createdAt }));
      },
      async upsertRunReviewer(input) { const row = await getConvexHttpClient().mutation((api as any).app.upsertRunReviewer, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never }); return { id: String(row._id), ...input }; },
      async listRunReviewers(input) { const rows = await getConvexHttpClient().query((api as any).app.listRunReviewers, { runId: input.runId as never }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, userId: row.userId, role: row.role, status: row.status, joinedAt: row.joinedAt, updatedAt: row.updatedAt })); },
      async upsertSharedRunVisibility(input) { const row = await getConvexHttpClient().mutation((api as any).app.upsertSharedRunVisibility, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never }); return { id: String(row._id), ...input }; },
      async listSharedRunVisibility(input) { const rows = await getConvexHttpClient().query((api as any).app.listSharedRunVisibility, { runId: input.runId as never }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, userId: row.userId, mode: row.mode, currentStage: row.currentStage, viewedAt: row.viewedAt, updatedAt: row.updatedAt })); },
      async addReviewThread(input) { const row = await getConvexHttpClient().mutation((api as any).app.addReviewThread, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never }); return { id: String(row._id), ...input }; },
      async listReviewThreads(input) { const rows = await getConvexHttpClient().query((api as any).app.listReviewThreads, { runId: input.runId as never, targetType: input.targetType, targetId: input.targetId }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, targetType: row.targetType, targetId: row.targetId, diffLineageRef: row.diffLineageRef, status: row.status, createdBy: row.createdBy, createdAt: row.createdAt, resolvedBy: row.resolvedBy, resolvedAt: row.resolvedAt })); },
      async resolveReviewThread(input) { await getConvexHttpClient().mutation((api as any).app.resolveReviewThread, input as any); },
      async addReviewComment(input) { const row = await getConvexHttpClient().mutation((api as any).app.addReviewComment, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, threadId: input.threadId as never }); return { id: String(row._id), ...input }; },
      async listReviewComments(input) { const rows = await getConvexHttpClient().query((api as any).app.listReviewComments, { runId: input.runId as never, threadId: input.threadId as never, targetType: input.targetType, targetId: input.targetId }); return rows.map((row: any) => ({ id: String(row._id), threadId: String(row.threadId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, targetType: row.targetType, targetId: row.targetId, authorId: row.authorId, body: row.body, createdAt: row.createdAt })); },
      async addReviewDecisionRecord(input) { const row = await getConvexHttpClient().mutation((api as any).app.addReviewDecisionRecord, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, approvalRequestId: input.approvalRequestId as never, batchId: input.batchId as never }); return { id: String(row._id), ...input }; },
      async listReviewDecisionRecords(input) { const rows = await getConvexHttpClient().query((api as any).app.listReviewDecisionRecords, { runId: input.runId as never, approvalRequestId: input.approvalRequestId as never, batchId: input.batchId as never }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, approvalRequestId: row.approvalRequestId ? String(row.approvalRequestId) : undefined, batchId: row.batchId, actorId: row.actorId, decision: row.decision, note: row.note, createdAt: row.createdAt })); },
      async addApprovalParticipantRecord(input) { const row = await getConvexHttpClient().mutation((api as any).app.addApprovalParticipantRecord, { ...input, approvalRequestId: input.approvalRequestId as never, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never }); return { id: String(row._id), ...input }; },
      async listApprovalParticipantRecords(input) { const rows = await getConvexHttpClient().query((api as any).app.listApprovalParticipantRecords, { runId: input.runId as never, approvalRequestId: input.approvalRequestId as never }); return rows.map((row: any) => ({ id: String(row._id), approvalRequestId: String(row.approvalRequestId), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, actorId: row.actorId, recommendation: row.recommendation, note: row.note, createdAt: row.createdAt })); },
      async addHandoffRecord(input) { const row = await getConvexHttpClient().mutation((api as any).app.addHandoffRecord, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, openQuestionsJson: JSON.stringify(input.openQuestions), unresolvedThreadIdsJson: JSON.stringify(input.unresolvedThreadIds) }); return { id: String(row._id), ...input }; },
      async listHandoffRecords(input) { const rows = await getConvexHttpClient().query((api as any).app.listHandoffRecords, { runId: input.runId as never }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, fromUserId: row.fromUserId, toUserId: row.toUserId, note: row.note, stage: row.stage, pendingApprovalCount: row.pendingApprovalCount, openQuestions: JSON.parse(row.openQuestionsJson), unresolvedThreadIds: JSON.parse(row.unresolvedThreadIdsJson), status: row.status, createdAt: row.createdAt, respondedAt: row.respondedAt })); },
      async updateHandoffStatus(input) { await getConvexHttpClient().mutation((api as any).app.updateHandoffStatus, input as any); },
      async addRevisionRequest(input) { const row = await getConvexHttpClient().mutation((api as any).app.addRevisionRequest, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never }); return { id: String(row._id), ...input }; },
      async listRevisionRequests(input) { const rows = await getConvexHttpClient().query((api as any).app.listRevisionRequests, { runId: input.runId as never, status: input.status }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, targetType: row.targetType, targetId: row.targetId, requestedBy: row.requestedBy, rationale: row.rationale, requestedOutcome: row.requestedOutcome, status: row.status, createdAt: row.createdAt, resolvedAt: row.resolvedAt })); },
      async updateRevisionRequest(input) { await getConvexHttpClient().mutation((api as any).app.updateRevisionRequest, input as any); },
      async upsertAgentPolicy(input) { const row = await getConvexHttpClient().mutation((api as any).app.upsertAgentPolicy, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, toolJson: JSON.stringify(input.tool), riskJson: JSON.stringify(input.risk), approvalJson: JSON.stringify(input.approval), runtimeJson: JSON.stringify(input.runtime), costJson: JSON.stringify(input.cost), concurrencyJson: JSON.stringify(input.concurrency), escalationJson: JSON.stringify(input.escalation) }); return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, scope: row.scope, tool: JSON.parse(row.toolJson), risk: JSON.parse(row.riskJson), approval: JSON.parse(row.approvalJson), runtime: JSON.parse(row.runtimeJson), cost: JSON.parse(row.costJson), concurrency: JSON.parse(row.concurrencyJson), escalation: JSON.parse(row.escalationJson), createdAt: row.createdAt, updatedAt: row.updatedAt }; },
      async getAgentPolicy(input) { const row = await getConvexHttpClient().query((api as any).app.getAgentPolicy, { workspaceId: input.workspaceId as never, systemId: input.systemId as never }); if (!row) return null; return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, scope: row.scope, tool: JSON.parse(row.toolJson), risk: JSON.parse(row.riskJson), approval: JSON.parse(row.approvalJson), runtime: JSON.parse(row.runtimeJson), cost: JSON.parse(row.costJson), concurrency: JSON.parse(row.concurrencyJson), escalation: JSON.parse(row.escalationJson), createdAt: row.createdAt, updatedAt: row.updatedAt }; },
      async addRunPolicySnapshot(input) { const row = await getConvexHttpClient().mutation((api as any).app.addRunPolicySnapshot, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, policyId: input.policyId as never, toolJson: JSON.stringify(input.tool), riskJson: JSON.stringify(input.risk), approvalJson: JSON.stringify(input.approval), runtimeJson: JSON.stringify(input.runtime), costJson: JSON.stringify(input.cost), concurrencyJson: JSON.stringify(input.concurrency), escalationJson: JSON.stringify(input.escalation) }); return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, policyId: String(row.policyId), resolvedFromScope: row.resolvedFromScope, tool: JSON.parse(row.toolJson), risk: JSON.parse(row.riskJson), approval: JSON.parse(row.approvalJson), runtime: JSON.parse(row.runtimeJson), cost: JSON.parse(row.costJson), concurrency: JSON.parse(row.concurrencyJson), escalation: JSON.parse(row.escalationJson), createdAt: row.createdAt }; },
      async getRunPolicySnapshot(input) { const row = await getConvexHttpClient().query((api as any).app.getRunPolicySnapshot, { runId: input.runId as never }); if (!row) return null; return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, policyId: String(row.policyId), resolvedFromScope: row.resolvedFromScope, tool: JSON.parse(row.toolJson), risk: JSON.parse(row.riskJson), approval: JSON.parse(row.approvalJson), runtime: JSON.parse(row.runtimeJson), cost: JSON.parse(row.costJson), concurrency: JSON.parse(row.concurrencyJson), escalation: JSON.parse(row.escalationJson), createdAt: row.createdAt }; },
      async addPolicyDecisionRecord(input) { const row = await getConvexHttpClient().mutation((api as any).app.addPolicyDecisionRecord, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never, policySnapshotId: input.policySnapshotId as never }); return { id: String(row._id), ...input }; },
      async listPolicyDecisionRecords(input) { const rows = await getConvexHttpClient().query((api as any).app.listPolicyDecisionRecords, { runId: input.runId as never }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, policySnapshotId: String(row.policySnapshotId), decisionType: row.decisionType, subject: row.subject, explanation: row.explanation, createdAt: row.createdAt })); },
      async upsertRuntimeUsageRecord(input) { const row = await getConvexHttpClient().mutation((api as any).app.upsertRuntimeUsageRecord, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never }); return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), providerCalls: row.providerCalls, estimatedTokens: row.estimatedTokens, estimatedCostUsd: row.estimatedCostUsd, elapsedMs: row.elapsedMs, autoAppliedActions: row.autoAppliedActions, createdAt: row.createdAt, updatedAt: row.updatedAt }; },
      async getRuntimeUsageRecord(input) { const row = await getConvexHttpClient().query((api as any).app.getRuntimeUsageRecord, { runId: input.runId as never }); if (!row) return null; return { id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), providerCalls: row.providerCalls, estimatedTokens: row.estimatedTokens, estimatedCostUsd: row.estimatedCostUsd, elapsedMs: row.elapsedMs, autoAppliedActions: row.autoAppliedActions, createdAt: row.createdAt, updatedAt: row.updatedAt }; },
      async addEscalationRecord(input) { const row = await getConvexHttpClient().mutation((api as any).app.addEscalationRecord, { ...input, runId: input.runId as never, workspaceId: input.workspaceId as never, systemId: input.systemId as never }); return { id: String(row._id), ...input }; },
      async listEscalationRecords(input) { const rows = await getConvexHttpClient().query((api as any).app.listEscalationRecords, { runId: input.runId as never }); return rows.map((row: any) => ({ id: String(row._id), runId: String(row.runId), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, reason: row.reason, suggestedAction: row.suggestedAction, severity: row.severity, createdAt: row.createdAt })); },
    },
    agentMemory: {
      async addMemoryEntry(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addMemoryEntry, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, sessionId: input.sessionId as never, runId: input.runId as never, tagsJson: JSON.stringify(input.tags), provenanceJson: JSON.stringify(input.provenance ?? {}) });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, sessionId: row.sessionId ? String(row.sessionId) : undefined, runId: row.runId ? String(row.runId) : undefined, scope: row.scope, type: row.type, source: row.source, confidence: row.confidence, status: row.status, title: row.title, summary: row.summary, detail: row.detail, tags: JSON.parse(row.tagsJson), provenance: JSON.parse(row.provenanceJson), staleAfter: row.staleAfter, createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async listMemoryEntries(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listMemoryEntries, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, sessionId: input.sessionId as never, runId: input.runId as never, status: input.status, type: input.type });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, sessionId: row.sessionId ? String(row.sessionId) : undefined, runId: row.runId ? String(row.runId) : undefined, scope: row.scope, type: row.type, source: row.source, confidence: row.confidence, status: row.status, title: row.title, summary: row.summary, detail: row.detail, tags: JSON.parse(row.tagsJson), provenance: JSON.parse(row.provenanceJson), staleAfter: row.staleAfter, createdAt: row.createdAt, updatedAt: row.updatedAt }));
      },
      async updateMemoryEntry(input) {
        const client = getConvexHttpClient();
        await client.mutation((api as any).app.patchMemoryEntry, { memoryEntryId: input.memoryEntryId as never, status: input.status, confidence: input.confidence, updatedAt: input.updatedAt });
      },
      async addBuilderStrategy(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addBuilderStrategy, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, planningDirectivesJson: JSON.stringify(input.planningDirectives), batchingDirectivesJson: JSON.stringify(input.batchingDirectives) });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, scope: row.scope, name: row.name, summary: row.summary, planningDirectives: JSON.parse(row.planningDirectivesJson), batchingDirectives: JSON.parse(row.batchingDirectivesJson), reviewPosture: row.reviewPosture, confidence: row.confidence, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async listBuilderStrategies(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listBuilderStrategies, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, status: input.status });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, scope: row.scope, name: row.name, summary: row.summary, planningDirectives: JSON.parse(row.planningDirectivesJson), batchingDirectives: JSON.parse(row.batchingDirectivesJson), reviewPosture: row.reviewPosture, confidence: row.confidence, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }));
      },
      async addPatternArtifact(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addPatternArtifact, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never, tagsJson: JSON.stringify(input.tags), provenanceJson: JSON.stringify(input.provenance ?? {}) });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), runId: row.runId ? String(row.runId) : undefined, scope: row.scope, title: row.title, summary: row.summary, intendedUse: row.intendedUse, inputContractSummary: row.inputContractSummary, outputContractSummary: row.outputContractSummary, riskNotes: row.riskNotes, tags: JSON.parse(row.tagsJson), provenance: JSON.parse(row.provenanceJson), status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async listPatternArtifacts(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listPatternArtifacts, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, status: input.status, tag: input.tag });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), runId: row.runId ? String(row.runId) : undefined, scope: row.scope, title: row.title, summary: row.summary, intendedUse: row.intendedUse, inputContractSummary: row.inputContractSummary, outputContractSummary: row.outputContractSummary, riskNotes: row.riskNotes, tags: JSON.parse(row.tagsJson), provenance: JSON.parse(row.provenanceJson), status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }));
      },
      async addReusableSubsystemPattern(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addReusableSubsystemPattern, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, tagsJson: JSON.stringify(input.tags) });
        return { id: String(row._id), patternArtifactId: String(row.patternArtifactId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), subsystemId: row.subsystemId, subsystemSummary: row.subsystemSummary, tags: JSON.parse(row.tagsJson), createdAt: row.createdAt };
      },
      async listReusableSubsystemPatterns(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listReusableSubsystemPatterns, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, subsystemId: input.subsystemId });
        return rows.map((row: any) => ({ id: String(row._id), patternArtifactId: String(row.patternArtifactId), workspaceId: String(row.workspaceId), systemId: String(row.systemId), subsystemId: row.subsystemId, subsystemSummary: row.subsystemSummary, tags: JSON.parse(row.tagsJson), createdAt: row.createdAt }));
      },
      async addDecisionRecord(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addDecisionRecord, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, runId: row.runId ? String(row.runId) : undefined, category: row.category, title: row.title, decision: row.decision, rationale: row.rationale, state: row.state, confidence: row.confidence, staleAfter: row.staleAfter, createdAt: row.createdAt, updatedAt: row.updatedAt };
      },
      async listDecisionRecords(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listDecisionRecords, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: row.systemId ? String(row.systemId) : undefined, runId: row.runId ? String(row.runId) : undefined, category: row.category, title: row.title, decision: row.decision, rationale: row.rationale, state: row.state, confidence: row.confidence, staleAfter: row.staleAfter, createdAt: row.createdAt, updatedAt: row.updatedAt }));
      },
      async addSessionContinuationRef(input) {
        const client = getConvexHttpClient();
        const row = await client.mutation((api as any).app.addSessionContinuationRef, { ...input, workspaceId: input.workspaceId as never, systemId: input.systemId as never, fromRunId: input.fromRunId as never, toRunId: input.toRunId as never, attachedMemoryEntryIdsJson: JSON.stringify(input.attachedMemoryEntryIds), attachedPatternIdsJson: JSON.stringify(input.attachedPatternIds), attachedDecisionIdsJson: JSON.stringify(input.attachedDecisionIds), strategyId: input.strategyId as never });
        return { id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), fromRunId: String(row.fromRunId), toRunId: String(row.toRunId), attachedMemoryEntryIds: JSON.parse(row.attachedMemoryEntryIdsJson), attachedPatternIds: JSON.parse(row.attachedPatternIdsJson), attachedDecisionIds: JSON.parse(row.attachedDecisionIdsJson), strategyId: row.strategyId ? String(row.strategyId) : undefined, summary: row.summary, createdAt: row.createdAt };
      },
      async listSessionContinuationRefs(input) {
        const client = getConvexHttpClient();
        const rows = await client.query((api as any).app.listSessionContinuationRefs, { workspaceId: input.workspaceId as never, systemId: input.systemId as never, runId: input.runId as never });
        return rows.map((row: any) => ({ id: String(row._id), workspaceId: String(row.workspaceId), systemId: String(row.systemId), fromRunId: String(row.fromRunId), toRunId: String(row.toRunId), attachedMemoryEntryIds: JSON.parse(row.attachedMemoryEntryIdsJson), attachedPatternIds: JSON.parse(row.attachedPatternIdsJson), attachedDecisionIds: JSON.parse(row.attachedDecisionIdsJson), strategyId: row.strategyId ? String(row.strategyId) : undefined, summary: row.summary, createdAt: row.createdAt }));
      }
    }
  };
}
