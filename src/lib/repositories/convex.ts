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
    }
  };
}
