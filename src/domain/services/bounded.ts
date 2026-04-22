import crypto from "node:crypto";
import { canComment, canEditSystem, canManageMembers, canViewSystem } from "@/domain/permissions";
import { PipesSchemaV1, type Role } from "@/domain/pipes_schema_v1/schema";
import { serializePipesSchema } from "@/domain/pipes_schema_v1/serde";
import { getEntitlements } from "@/domain/templates/plans";
import type { AppContext, FeedbackCategory, FeedbackSeverity, FeedbackStatus, RepositorySet, SystemBundle } from "@/lib/repositories/contracts";
import { getBillingService } from "@/lib/billing";
import { env, resolveRuntimeMode } from "@/lib/env";
import { getEmailService } from "@/lib/email";
import { getAiService } from "@/lib/ai";
import { starterTemplates } from "@/domain/templates/catalog";
import { validateSystem } from "@/domain/validation";
import { hashAgentToken, issueAgentTokenSecret, parseCapabilityList, type AgentCapability } from "@/lib/protocol/tokens";
import { ProtocolError } from "@/lib/protocol/errors";
import { canAccessAdmin } from "@/lib/admin/access";
import { isProductSignalEvent, type ProductSignalEvent } from "@/domain/services/product_signals";

function assertCanView(ctx: AppContext) { if (!canViewSystem(ctx.role)) throw new Error("Insufficient permissions."); }
function assertCanEdit(ctx: AppContext) { if (!canEditSystem(ctx.role)) throw new Error("Insufficient permissions."); }

export class AccessService {
  ensureCanView = assertCanView;
  ensureCanEdit = assertCanEdit;
  ensureCanComment(ctx: AppContext) { if (!canComment(ctx.role)) throw new Error("Insufficient permissions."); }
  ensureCanManageMembers(ctx: AppContext) { if (!canManageMembers(ctx.role)) throw new Error("Insufficient permissions."); }
  ensureInternalOperator(email?: string | null) { if (!canAccessAdmin(email)) throw new Error("Internal operator access required."); }
}

export class EntitlementService {
  constructor(private readonly repos: RepositorySet) {}
  async getWorkspaceEntitlements(workspaceId: string) { return getEntitlements(await this.repos.entitlements.getPlan(workspaceId)); }
  async getPlanState(workspaceId: string) {
    const state = await this.repos.entitlements.getPlanState(workspaceId);
    return { ...state, entitlements: getEntitlements(state.plan) };
  }
}

export class SystemService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService, private readonly entitlements: EntitlementService) {}
  async list(ctx: AppContext) { this.access.ensureCanView(ctx); return (await this.repos.systems.list(ctx.workspaceId)).filter((s) => !s.archivedAt); }
  async listAll(ctx: AppContext) { this.access.ensureCanView(ctx); return this.repos.systems.list(ctx.workspaceId); }
  async create(ctx: AppContext, input: { name: string; description?: string }) {
    this.access.ensureCanEdit(ctx);
    const existing = await this.repos.systems.list(ctx.workspaceId);
    const limits = await this.entitlements.getWorkspaceEntitlements(ctx.workspaceId);
    if (existing.length >= limits.maxSystems) throw new Error(`Plan limit reached (${limits.maxSystems} systems). Upgrade required.`);
    const created = await this.repos.systems.create({ workspaceId: ctx.workspaceId, userId: ctx.userId, name: input.name, description: input.description ?? "" });
    if (existing.length === 0) {
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "signal.first_system_created", targetType: "system", targetId: created, outcome: "success", systemId: created });
    }
    return created;
  }
  async getBundle(ctx: AppContext, systemId: string): Promise<SystemBundle> { this.access.ensureCanView(ctx); return this.repos.systems.getBundle(systemId); }
  async archive(ctx: AppContext, systemId: string) { this.access.ensureCanEdit(ctx); return this.repos.systems.archive(systemId); }
  async restore(ctx: AppContext, systemId: string) { this.access.ensureCanEdit(ctx); return this.repos.systems.restore(systemId); }
}

export class GraphService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService) {}
  async mutate(ctx: AppContext, payload: any) {
    this.access.ensureCanEdit(ctx);
    if (payload.action === "addNode") return this.repos.graph.addNode({ systemId: payload.systemId, type: payload.type, title: payload.title, description: payload.description, x: payload.x ?? 200, y: payload.y ?? 200 });
    if (payload.action === "updateNode") return this.repos.graph.updateNode({ nodeId: payload.nodeId, title: payload.title, description: payload.description, position: payload.position });
    if (payload.action === "deleteNode") return this.repos.graph.deleteNode(payload.nodeId);
    if (payload.action === "addPipe") return this.repos.graph.addPipe({ systemId: payload.systemId, fromNodeId: payload.fromNodeId, toNodeId: payload.toNodeId });
    if (payload.action === "deletePipe") return this.repos.graph.deletePipe(payload.pipeId);
  }
}

export class CommentService { constructor(private readonly repos: RepositorySet, private readonly access: AccessService) {} async add(ctx: AppContext, input: { systemId: string; body: string; nodeId?: string }) { this.access.ensureCanComment(ctx); await this.repos.comments.add({ ...input, authorId: ctx.userId }); } }
export class PresenceService { constructor(private readonly repos: RepositorySet, private readonly access: AccessService) {} async list(ctx: AppContext, systemId: string) { this.access.ensureCanView(ctx); return this.repos.presence.list(systemId); } async upsert(ctx: AppContext, body: any) { await this.repos.presence.upsert({ systemId: body.systemId, userId: ctx.userId, sessionId: body.sessionId ?? "session", selectedNodeId: body.selectedNodeId, editingTarget: body.editingTarget, cursor: body.cursor }); } }

export class ProductSignalService {
  constructor(private readonly repos: RepositorySet) {}
  async track(ctx: AppContext, event: ProductSignalEvent, metadata?: Record<string, unknown>) {
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: `signal.${event}`,
      targetType: "product_signal",
      outcome: "success",
      metadata: metadata ? JSON.stringify(metadata) : undefined
    });
  }
  async trackUnknown(ctx: AppContext, event: string, metadata?: Record<string, unknown>) {
    if (!isProductSignalEvent(event)) return;
    await this.track(ctx, event, metadata);
  }
}

export class SchemaExportService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService) {}
  async export(ctx: AppContext, systemId: string) {
    this.access.ensureCanView(ctx);
    const bundle = await this.repos.systems.getBundle(systemId);
    const systems = await this.repos.systems.list(ctx.workspaceId);
    const members = await this.repos.memberships.list(ctx.workspaceId);
    return serializePipesSchema({
      version: "pipes_schema_v1",
      users: [{ id: ctx.userId, email: "unknown@pipes.local", name: "User", createdAt: new Date().toISOString() }],
      workspaces: [{ id: ctx.workspaceId, ownerId: ctx.userId, name: "Workspace", slug: "workspace", plan: ctx.plan, createdAt: new Date().toISOString() }],
      systems: systems.filter((s) => s.id === systemId).map((s) => ({ ...s, nodeIds: bundle.nodes.map((n) => n.id), portIds: bundle.nodes.flatMap((n) => n.portIds), pipeIds: bundle.pipes.map((p) => p.id), groupIds: [], annotationIds: [], commentIds: bundle.comments.map((c) => c.id), assetIds: [], snippetIds: [], subsystemNodeIds: [] })),
      views: [], nodes: bundle.nodes as never,
      ports: bundle.nodes.flatMap((n) => [n.portIds[0] ? { id: n.portIds[0], nodeId: n.id, key: "in", label: "in", direction: "input", dataType: "any", required: false } : null, n.portIds[1] ? { id: n.portIds[1], nodeId: n.id, key: "out", label: "out", direction: "output", dataType: "any", required: false } : null]).filter(Boolean),
      pipes: bundle.pipes.map((p) => ({ id: p.id, systemId: p.systemId, fromPortId: p.fromPortId, toPortId: p.toPortId })),
      groups: [], annotations: [], comments: bundle.comments.map((c) => ({ id: c.id, systemId: c.systemId, authorId: c.authorId, body: c.body, targets: [{ type: c.nodeId ? "Node" : "System", id: c.nodeId ?? systemId }], createdAt: c.createdAt })),
      assets: [], snippets: [], templates: [], versions: bundle.versions.map((v) => ({ id: v.id, systemId: v.systemId, name: v.name, createdBy: v.authorId, createdAt: v.createdAt, snapshot: v.snapshot })), invites: [], roles: members.map((m) => ({ workspaceId: ctx.workspaceId, userId: m.userId, role: m.role })), agentTokens: [], validationReports: [], simulationRuns: []
    } as never);
  }
}

export class VersionService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService, private readonly exportService: SchemaExportService, private readonly entitlementService: EntitlementService) {}
  async list(ctx: AppContext, systemId: string) { this.access.ensureCanView(ctx); return this.repos.versions.list(systemId); }
  async create(ctx: AppContext, systemId: string, name: string) { this.access.ensureCanEdit(ctx); if (!(await this.entitlementService.getWorkspaceEntitlements(ctx.workspaceId)).versionHistory) throw new Error("Plan does not include version history."); await this.repos.versions.add({ systemId, authorId: ctx.userId, name, snapshot: await this.exportService.export(ctx, systemId) }); }
  async restore(ctx: AppContext, systemId: string, versionId: string) { this.access.ensureCanEdit(ctx); const version = await this.repos.versions.get(systemId, versionId); if (!version) throw new Error("Version not found."); await this.create(ctx, systemId, `Pre-restore ${new Date().toISOString()}`); PipesSchemaV1.parse(JSON.parse(version.snapshot)); await this.repos.versions.restoreSnapshot(systemId, version.snapshot); }
}

export class CollaborationService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService, private readonly entitlements: EntitlementService) {}
  async list(ctx: AppContext) { this.access.ensureCanManageMembers(ctx); return { members: await this.repos.memberships.list(ctx.workspaceId), invites: await this.repos.invites.list(ctx.workspaceId) }; }
  async invite(ctx: AppContext, email: string, role: Role) { this.access.ensureCanManageMembers(ctx); if (!(await this.entitlements.getWorkspaceEntitlements(ctx.workspaceId)).collaboration) throw new Error("Plan does not include collaboration."); const token = crypto.randomBytes(18).toString("hex"); const expiresAt = new Date(Date.now() + 604800000).toISOString(); await this.repos.invites.add({ workspaceId: ctx.workspaceId, email, role, token, invitedBy: ctx.userId, expiresAt }); await getEmailService().sendWorkspaceInvite({ email, workspaceName: "Pipes Workspace", inviterName: "Pipes teammate", acceptUrl: `${env.NEXT_PUBLIC_APP_URL}/invites/${token}`, role }); return { token }; }
  async acceptInvite(ctx: AppContext, token: string) { const invite = await this.repos.invites.getByToken(token); if (!invite || invite.status !== "pending" || new Date(invite.expiresAt).getTime() < Date.now()) throw new Error("Invite invalid."); await this.repos.memberships.add(invite.workspaceId, ctx.userId, invite.role); await this.repos.invites.accept(token, ctx.userId); await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "signal.invite_accepted", targetType: "invite", targetId: token, outcome: "success" }); }
  async cancelInvite(ctx: AppContext, token: string) { this.access.ensureCanManageMembers(ctx); await this.repos.invites.cancel(token); }
  async updateMemberRole(ctx: AppContext, userId: string, role: Role) {
    this.access.ensureCanManageMembers(ctx);
    const members = await this.repos.memberships.list(ctx.workspaceId);
    const target = members.find((member) => member.userId === userId);
    if (!target) throw new Error("Member not found.");
    if (target.role === "Owner") throw new Error("Owner role cannot be changed.");
    if (role === "Owner") throw new Error("Ownership transfer is not supported in this pass.");
    if (ctx.userId === userId && target.role === "Admin" && role !== "Admin") throw new Error("Cannot self-demote admin in this flow.");
    await this.repos.memberships.updateRole(ctx.workspaceId, userId, role);
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "governance.member_role_changed",
      targetType: "membership",
      targetId: userId,
      outcome: "success",
      metadata: JSON.stringify({ fromRole: target.role, toRole: role })
    });
  }
}

export class BillingService { constructor(private readonly repos: RepositorySet, private readonly access: AccessService) {} async getSummary(ctx: AppContext) { const state = await this.repos.entitlements.getPlanState(ctx.workspaceId); return { ...state, entitlements: getEntitlements(state.plan) }; } async startCheckout(ctx: AppContext, plan: "Pro" | "Builder") { this.access.ensureCanManageMembers(ctx); return getBillingService().createCheckoutSession({ workspaceId: ctx.workspaceId, plan, successUrl: `${env.NEXT_PUBLIC_APP_URL}/settings/billing?status=success`, cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/settings/billing?status=cancel` }); } async startPortal(ctx: AppContext) { this.access.ensureCanManageMembers(ctx); return getBillingService().createPortalSession({ workspaceId: ctx.workspaceId, returnUrl: `${env.NEXT_PUBLIC_APP_URL}/settings/billing` }); } async handleWebhook(request: Request) { const event = await getBillingService().parseWebhook(request); if (!event) return false; await this.repos.entitlements.upsertPlanState(event); return true; } }

export class WorkspaceService { constructor(private readonly repos: RepositorySet) {} async getPlan(workspaceId: string) { return this.repos.workspaces.getPlan(workspaceId); } }

export class ProtocolService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService) {}
  private ensureCanManageTokens(ctx: AppContext) {
    if (ctx.actorType === "agent") throw new Error("Agent tokens cannot manage tokens.");
    this.access.ensureCanManageMembers(ctx);
  }
  async createToken(ctx: AppContext, input: { name: string; capabilities: AgentCapability[]; systemId?: string }) {
    this.ensureCanManageTokens(ctx);
    const secret = issueAgentTokenSecret();
    const tokenHash = hashAgentToken(secret);
    const tokenPreview = `${secret.slice(0, 8)}…`;
    const created = await this.repos.agentTokens.create({
      workspaceId: ctx.workspaceId,
      name: input.name,
      capabilities: parseCapabilityList(input.capabilities),
      systemId: input.systemId,
      tokenHash,
      tokenPreview,
      createdByUserId: ctx.userId
    });
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "token.create",
      targetType: "agent_token",
      targetId: created.id,
      outcome: "success",
      systemId: input.systemId
    });
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "signal.token_created",
      targetType: "agent_token",
      targetId: created.id,
      outcome: "success",
      systemId: input.systemId
    });
    return { id: created.id, secret };
  }
  async listTokens(ctx: AppContext) {
    this.ensureCanManageTokens(ctx);
    const [tokens, audits] = await Promise.all([
      this.repos.agentTokens.list(ctx.workspaceId),
      this.repos.audits.list(ctx.workspaceId, { actionPrefix: "protocol." })
    ]);
    return tokens.map((token) => ({
      ...token,
      usageCount: audits.filter((a) => a.actorType === "agent" && a.actorId === token.id).length
    }));
  }
  async revokeToken(ctx: AppContext, tokenId: string) {
    this.ensureCanManageTokens(ctx);
    await this.repos.agentTokens.revoke(tokenId);
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "token.revoke",
      targetType: "agent_token",
      targetId: tokenId,
      outcome: "success"
    });
  }
  async listAudits(ctx: AppContext, filter?: { actorType?: "user" | "agent"; actorId?: string; actionPrefix?: string; systemId?: string; transport?: string; outcome?: "success" | "failure"; since?: string; until?: string; limit?: number }) {
    this.access.ensureCanManageMembers(ctx);
    return this.repos.audits.list(ctx.workspaceId, filter);
  }
  async writeAudit(ctx: AppContext, input: { action: string; targetType: string; targetId?: string; outcome: "success" | "failure"; systemId?: string; metadata?: string }) {
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      outcome: input.outcome,
      systemId: input.systemId,
      metadata: input.metadata
    });
    if (ctx.actorType === "agent" && input.action.startsWith("protocol.")) {
      await this.repos.audits.add({
        actorType: ctx.actorType,
        actorId: ctx.actorId,
        workspaceId: ctx.workspaceId,
        action: "signal.token_authenticated_protocol_write",
        targetType: input.targetType,
        targetId: input.targetId,
        outcome: input.outcome,
        systemId: input.systemId
      });
    }
  }
}

export class ProtocolGuardService {
  constructor(private readonly repos: RepositorySet) {}
  async consumeRateLimit(ctx: AppContext, transport: "rest" | "mcp", bucket: string, limit = 60, windowSeconds = 60) {
    const rateBucket = `${transport}:${ctx.actorType}:${ctx.actorId}:${bucket}`;
    const decision = await this.repos.rateLimits.consume({ bucket: rateBucket, limit, windowSeconds, now: new Date().toISOString() });
    if (!decision.allowed) throw new ProtocolError("RATE_LIMITED", "Rate limit exceeded.", 429, { retryAfterSeconds: decision.retryAfterSeconds });
    return decision;
  }
  async withIdempotency<T>(ctx: AppContext, input: { key?: string; route: string; body: unknown }, handler: () => Promise<{ statusCode: number; data: T }>) {
    const idemKey = input.key?.trim();
    if (!idemKey) return { replayed: false, ...(await handler()) };
    const requestHash = crypto.createHash("sha256").update(JSON.stringify(input.body ?? {})).digest("hex");
    const existing = await this.repos.idempotency.get({ workspaceId: ctx.workspaceId, actorId: ctx.actorId, route: input.route, key: idemKey });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ProtocolError("CONFLICT", "Idempotency key re-used with different payload.", 409);
      return { replayed: true, statusCode: existing.statusCode, data: JSON.parse(existing.responseJson) as T };
    }
    const result = await handler();
    await this.repos.idempotency.put({
      workspaceId: ctx.workspaceId,
      actorId: ctx.actorId,
      route: input.route,
      key: idemKey,
      requestHash,
      responseJson: JSON.stringify(result.data),
      statusCode: result.statusCode
    });
    return { replayed: false, ...result };
  }
}

export class TemplateService {
  constructor(private readonly systems: SystemService, private readonly graph: GraphService, private readonly repos: RepositorySet, private readonly signals: ProductSignalService) {}
  list() { return starterTemplates; }
  async instantiate(ctx: AppContext, templateId: string, name?: string) {
    const template = starterTemplates.find((t) => t.id === templateId);
    if (!template) throw new Error("Template not found.");
    const systemId = await this.systems.create(ctx, { name: name ?? template.title, description: template.description });
    const map = new Map<string, string>();
    for (const node of template.nodes) map.set(node.id, await this.graph.mutate(ctx, { action: "addNode", systemId, type: node.type, title: node.title, x: node.x, y: node.y }) as string);
    for (const pipe of template.pipes) await this.graph.mutate(ctx, { action: "addPipe", systemId, fromNodeId: map.get(pipe.fromNodeId), toNodeId: map.get(pipe.toNodeId) });
    const prior = await this.repos.audits.list(ctx.workspaceId, { actionPrefix: "signal.first_template_instantiated", actorId: ctx.actorId, limit: 1 });
    if (prior.length === 0) await this.signals.track(ctx, "first_template_instantiated", { templateId, systemId });
    return { systemId };
  }
}

export class AiGenerationService {
  constructor(private readonly systems: SystemService, private readonly graph: GraphService, private readonly versions: VersionService, private readonly entitlements: EntitlementService, private readonly signals: ProductSignalService, private readonly repos: RepositorySet) {}
  private async assertAiAllowed(workspaceId: string) { if (!(await this.entitlements.getWorkspaceEntitlements(workspaceId)).aiGeneration) throw new Error("AI generation requires Builder plan."); }
  async generateDraft(ctx: AppContext, input: any) { await this.assertAiAllowed(ctx.workspaceId); const draft = await getAiService().generateSystemFromPrompt(input); return draft; }
  async commitDraft(ctx: AppContext, draft: any) { await this.assertAiAllowed(ctx.workspaceId); const systemId = await this.systems.create(ctx, { name: draft.systemName, description: draft.description }); const map = new Map<string, string>(); for (const n of draft.nodes) map.set(n.id, await this.graph.mutate(ctx, { action: "addNode", systemId, type: n.type, title: n.title, description: n.description, x: n.x, y: n.y }) as string); for (const p of draft.pipes) await this.graph.mutate(ctx, { action: "addPipe", systemId, fromNodeId: map.get(p.fromNodeId), toNodeId: map.get(p.toNodeId) }); const prior = await this.repos.audits.list(ctx.workspaceId, { actionPrefix: "signal.first_ai_generated_system_committed", actorId: ctx.actorId, limit: 1 }); if (prior.length === 0) await this.signals.track(ctx, "first_ai_generated_system_committed", { systemId }); return { systemId }; }
  private normalizeSuggestion(suggestion: any) {
    return (suggestion.changes ?? []).map((change: any, index: number) => ({
      id: change.id ?? `chg_${index + 1}`,
      action: change.action,
      nodeId: change.nodeId,
      pipeId: change.pipeId,
      payload: change.payload ?? {},
      rationale: change.rationale ?? suggestion.summary ?? "AI recommendation",
      warnings: change.warnings ?? []
    }));
  }
  async suggestEdits(ctx: AppContext, systemId: string, prompt: string) {
    await this.assertAiAllowed(ctx.workspaceId);
    const bundle = await this.systems.getBundle(ctx, systemId);
    const suggestion = await getAiService().suggestSystemEdits({ prompt, systemSummary: `${bundle.system.name}: ${bundle.system.description}`, nodes: bundle.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type })) });
    const changes = this.normalizeSuggestion(suggestion);
    await this.signals.track(ctx, "ai_edits_suggested", { systemId, changeCount: changes.length });
    return { ...suggestion, changes };
  }
  async applyEdits(ctx: AppContext, systemId: string, suggestion: any, acceptedChangeIds?: string[]) {
    await this.assertAiAllowed(ctx.workspaceId);
    const changes = this.normalizeSuggestion(suggestion);
    const acceptedSet = new Set(acceptedChangeIds?.length ? acceptedChangeIds : changes.map((c: any) => c.id));
    const selected = changes.filter((c: any) => acceptedSet.has(c.id));
    const addedMap = new Map<string, string>();
    const skipped: Array<{ id: string; reason: string }> = [];
    await this.versions.create(ctx, systemId, "AI pre-edit snapshot");
    for (const c of selected) {
      if (c.action === "addNode") {
        const created = await this.graph.mutate(ctx, { action: "addNode", systemId, ...(c.payload ?? {}) });
        if (c.payload?.id) addedMap.set(c.payload.id, String(created));
        continue;
      }
      if (c.action === "updateNode") { await this.graph.mutate(ctx, { action: "updateNode", nodeId: c.nodeId, ...(c.payload ?? {}) }); continue; }
      if (c.action === "deleteNode") { await this.graph.mutate(ctx, { action: "deleteNode", nodeId: c.nodeId }); continue; }
      if (c.action === "addPipe") {
        const fromNodeId = addedMap.get(c.payload?.fromNodeId) ?? c.payload?.fromNodeId;
        const toNodeId = addedMap.get(c.payload?.toNodeId) ?? c.payload?.toNodeId;
        if (!fromNodeId || !toNodeId) { skipped.push({ id: c.id, reason: "Dependent nodes missing for addPipe." }); continue; }
        await this.graph.mutate(ctx, { action: "addPipe", systemId, fromNodeId, toNodeId });
        continue;
      }
      if (c.action === "deletePipe") { await this.graph.mutate(ctx, { action: "deletePipe", pipeId: c.pipeId }); continue; }
      skipped.push({ id: c.id, reason: `Unsupported action ${c.action}` });
    }
    const b = await this.systems.getBundle(ctx, systemId);
    const validation = validateSystem({ id: b.system.id, workspaceId: b.system.workspaceId, name: b.system.name, description: b.system.description, createdBy: b.system.createdBy, createdAt: b.system.createdAt, updatedAt: b.system.updatedAt, nodeIds: b.nodes.map((n) => n.id), portIds: b.nodes.flatMap((n) => n.portIds), pipeIds: b.pipes.map((p) => p.id), groupIds: [], annotationIds: [], commentIds: b.comments.map((c) => c.id), assetIds: [], snippetIds: [], subsystemNodeIds: [] } as never, b.nodes as never, [] as never, b.pipes as never);
    if (selected.length !== changes.length) await this.signals.track(ctx, "ai_edit_partially_applied", { systemId, selected: selected.length, total: changes.length, skipped: skipped.length });
    return { validation, appliedChangeIds: selected.map((c: any) => c.id), skipped };
  }
}

export class ImportExportService {
  constructor(private readonly systems: SystemService, private readonly graph: GraphService, private readonly versions: VersionService, private readonly schema: SchemaExportService, private readonly signals: ProductSignalService) {}
  async planMerge(ctx: AppContext, raw: string, targetSystemId: string) {
    const parsed = PipesSchemaV1.safeParse(JSON.parse(raw));
    if (!parsed.success) return { ok: false, diagnostics: parsed.error.issues.map((i) => i.message) };
    const doc = parsed.data;
    const src = doc.systems[0];
    if (!src) return { ok: false, diagnostics: ["No system in schema"] };
    const existing = await this.systems.getBundle(ctx, targetSystemId);
    const byTitle = new Map(existing.nodes.map((n) => [n.title.toLowerCase(), n]));
    const additions: any[] = [];
    const updates: any[] = [];
    const conflicts: any[] = [];
    for (const n of doc.nodes.filter((n) => n.systemId === src.id)) {
      const match = byTitle.get(n.title.toLowerCase());
      if (!match) additions.push({ action: "addNode", payload: { type: n.type, title: n.title, description: n.description, x: n.position.x, y: n.position.y } });
      else if (match.type !== n.type) conflicts.push({ title: n.title, existingType: match.type, importType: n.type });
      else updates.push({ action: "updateNode", nodeId: match.id, payload: { title: n.title, description: n.description, position: n.position } });
    }
    return { ok: true, targetSystemId, summary: { additions: additions.length, updates: updates.length, conflicts: conflicts.length }, additions, updates, conflicts, warnings: conflicts.length ? ["Conflicts require replace_conflicts strategy to overwrite types."] : [] };
  }
  async applyMerge(ctx: AppContext, plan: any, strategy: "safe_upsert" | "replace_conflicts" = "safe_upsert") {
    await this.versions.create(ctx, plan.targetSystemId, "Pre-merge snapshot");
    for (const update of plan.updates ?? []) await this.graph.mutate(ctx, update);
    for (const add of plan.additions ?? []) await this.graph.mutate(ctx, { ...add, systemId: plan.targetSystemId });
    if (strategy === "replace_conflicts") {
      for (const conflict of plan.conflicts ?? []) {
        const bundle = await this.systems.getBundle(ctx, plan.targetSystemId);
        const match = bundle.nodes.find((n) => n.title.toLowerCase() === String(conflict.title).toLowerCase());
        if (match) await this.graph.mutate(ctx, { action: "updateNode", nodeId: match.id, title: conflict.title, description: `Replaced during merge as ${conflict.importType}` });
      }
    }
    await this.signals.track(ctx, "import_merged", { targetSystemId: plan.targetSystemId, additions: plan.summary?.additions ?? 0, updates: plan.summary?.updates ?? 0, conflicts: plan.summary?.conflicts ?? 0, strategy });
    return { ok: true, applied: { additions: plan.summary?.additions ?? 0, updates: plan.summary?.updates ?? 0, conflicts: strategy === "replace_conflicts" ? plan.summary?.conflicts ?? 0 : 0 } };
  }
  async importSchema(ctx: AppContext, raw: string, mode: "new" | "existing", targetSystemId?: string) {
    const parsed = PipesSchemaV1.safeParse(JSON.parse(raw));
    if (!parsed.success) return { ok: false, diagnostics: parsed.error.issues.map((i) => i.message) };
    const doc = parsed.data; const src = doc.systems[0]; if (!src) return { ok: false, diagnostics: ["No system in schema"] };
    await this.signals.track(ctx, "import_merge_attempted", { mode, targetSystemId: targetSystemId ?? null });
    if (mode === "existing") {
      if (!targetSystemId) return { ok: false, diagnostics: ["Missing target system"] };
      const plan = await this.planMerge(ctx, raw, targetSystemId);
      if (plan.ok && (plan.summary?.conflicts ?? 0) > 0) await this.signals.track(ctx, "import_merge_conflict_encountered", { targetSystemId, conflicts: plan.summary?.conflicts ?? 0 });
      if (!plan.ok) return plan;
      return { ok: true, mode: "existing", mergePlan: plan };
    }
    const systemId = await this.systems.create(ctx, { name: src.name, description: src.description });
    const map = new Map<string, string>();
    for (const n of doc.nodes.filter((n) => n.systemId === src.id)) map.set(n.id, await this.graph.mutate(ctx, { action: "addNode", systemId, type: n.type, title: n.title, description: n.description, x: n.position.x, y: n.position.y }) as string);
    for (const p of doc.pipes.filter((p) => p.systemId === src.id)) { const fromNode = doc.ports.find((port) => port.id === p.fromPortId)?.nodeId; const toNode = doc.ports.find((port) => port.id === p.toPortId)?.nodeId; if (fromNode && toNode) await this.graph.mutate(ctx, { action: "addPipe", systemId, fromNodeId: map.get(fromNode), toNodeId: map.get(toNode) }); }
    await this.signals.track(ctx, "import_merged", { mode: "new", systemId });
    return { ok: true, systemId, diagnostics: [] };
  }
  async exportSystem(ctx: AppContext, systemId: string) { const canonical = await this.schema.export(ctx, systemId); const b = await this.systems.getBundle(ctx, systemId); return { schemaVersion: "pipes_schema_v1", canonical, markdown: `# ${b.system.name}\n\n${b.system.description}\n\n## Nodes\n${b.nodes.map((n) => `- ${n.title} (${n.type})`).join("\n")}\n` }; }
}

export class SystemLibraryService {
  constructor(private readonly systems: SystemService, private readonly repos: RepositorySet, private readonly access: AccessService, private readonly signals: ProductSignalService) {}
  private async deriveUserState(ctx: AppContext) {
    const audits = await this.repos.audits.list(ctx.workspaceId, { actorType: "user", actionPrefix: "library." });
    const favorite = new Map<string, boolean>();
    const tags = new Map<string, string[]>();
    const lastOpened = new Map<string, string>();
    for (const audit of audits) {
      if (audit.actorId !== ctx.userId) continue;
      const meta = audit.metadata ? JSON.parse(audit.metadata) : {};
      const systemId = String(meta.systemId ?? audit.systemId ?? "");
      if (!systemId) continue;
      if (audit.action === "library.favorite_set") favorite.set(systemId, Boolean(meta.favorite));
      if (audit.action === "library.tags_set") tags.set(systemId, Array.isArray(meta.tags) ? meta.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : []);
      if (audit.action === "library.system_opened") lastOpened.set(systemId, audit.createdAt);
    }
    return { favorite, tags, lastOpened };
  }
  async query(ctx: AppContext, input?: { q?: string; status?: "active" | "archived" | "favorites" | "mine" | "shared"; tag?: string; sort?: "recent_activity" | "name" | "created" | "updated" }) {
    this.access.ensureCanView(ctx);
    const systems = await this.systems.listAll(ctx);
    const state = await this.deriveUserState(ctx);
    const q = String(input?.q ?? "").trim().toLowerCase();
    let rows = systems.map((s) => ({ ...s, favorite: state.favorite.get(s.id) ?? false, tags: state.tags.get(s.id) ?? [], lastOpenedAt: state.lastOpened.get(s.id) }));
    if (input?.status === "active") rows = rows.filter((r) => !r.archivedAt);
    if (input?.status === "archived") rows = rows.filter((r) => !!r.archivedAt);
    if (input?.status === "favorites") rows = rows.filter((r) => r.favorite && !r.archivedAt);
    if (input?.status === "mine") rows = rows.filter((r) => r.createdBy === ctx.userId && !r.archivedAt);
    if (input?.status === "shared") rows = rows.filter((r) => r.createdBy !== ctx.userId && !r.archivedAt);
    if (input?.tag) rows = rows.filter((r) => r.tags.includes(input.tag ?? ""));
    if (q) {
      await this.signals.track(ctx, "dashboard_search_used", { qLength: q.length });
      rows = rows.filter((r) => [r.name, r.description, ...r.tags].join(" ").toLowerCase().includes(q));
      if (rows.length === 0) await this.signals.track(ctx, "search_no_results", { qLength: q.length });
    }
    const sort = input?.sort ?? "recent_activity";
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      const aRecent = Math.max(new Date(a.updatedAt).getTime(), a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0);
      const bRecent = Math.max(new Date(b.updatedAt).getTime(), b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0);
      return bRecent - aRecent;
    });
    const recent = [...rows].filter((r) => r.lastOpenedAt).sort((a, b) => new Date(b.lastOpenedAt ?? 0).getTime() - new Date(a.lastOpenedAt ?? 0).getTime()).slice(0, 6);
    const favorites = rows.filter((r) => r.favorite && !r.archivedAt).slice(0, 6);
    return { rows, recent, favorites, availableTags: [...new Set(rows.flatMap((r) => r.tags))] };
  }
  async setFavorite(ctx: AppContext, systemId: string, favorite: boolean) {
    this.access.ensureCanView(ctx);
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "library.favorite_set", targetType: "system", targetId: systemId, outcome: "success", systemId, metadata: JSON.stringify({ systemId, favorite }) });
    await this.signals.track(ctx, "favorite_added", { systemId, favorite });
    return { ok: true };
  }
  async setTags(ctx: AppContext, systemId: string, tags: string[]) {
    this.access.ensureCanEdit(ctx);
    const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 8);
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "library.tags_set", targetType: "system", targetId: systemId, outcome: "success", systemId, metadata: JSON.stringify({ systemId, tags: normalized }) });
    return { ok: true, tags: normalized };
  }
  async markOpened(ctx: AppContext, systemId: string) {
    this.access.ensureCanView(ctx);
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "library.system_opened", targetType: "system", targetId: systemId, outcome: "success", systemId, metadata: JSON.stringify({ systemId }) });
    await this.signals.track(ctx, "system_reopened_from_recents", { systemId });
  }
  async archive(ctx: AppContext, systemId: string) { await this.systems.archive(ctx, systemId); await this.signals.track(ctx, "archive_used", { systemId }); }
  async restore(ctx: AppContext, systemId: string) { await this.systems.restore(ctx, systemId); }
}

export class OnboardingService {
  constructor(private readonly templates: TemplateService, private readonly systems: SystemService, private readonly signals: ProductSignalService) {}
  async start(ctx: AppContext) { await this.signals.track(ctx, "onboarding_started", { workspaceId: ctx.workspaceId }); }
  async recommend(ctx: AppContext, input: { role?: string; useCase?: string }) {
    const role = String(input.role ?? "").toLowerCase();
    const useCase = String(input.useCase ?? "").toLowerCase();
    const ranked = this.templates.list().map((t) => ({ t, score: (useCase && t.useCase.toLowerCase().includes(useCase) ? 3 : 0) + (role && t.category.toLowerCase().includes(role) ? 2 : 0) })).sort((a, b) => b.score - a.score).map((r) => r.t);
    return { recommendedTemplates: ranked.slice(0, 3), createPaths: ["blank", "template", "ai", "import"] };
  }
  async complete(ctx: AppContext, input: { role?: string; useCase?: string; chosenPath: "blank" | "template" | "ai" | "import" }) {
    await this.signals.track(ctx, "onboarding_completed", { chosenPath: input.chosenPath, role: input.role ?? null, useCase: input.useCase ?? null });
    const systems = await this.systems.list(ctx);
    if (systems.length === 1) await this.signals.track(ctx, "first_system_created", { systemId: systems[0].id });
    if (input.chosenPath !== "blank") await this.signals.track(ctx, "first_template_instantiated", { chosenPath: input.chosenPath });
    if (systems.length > 0 && input.chosenPath !== "blank") await this.signals.track(ctx, "activation_achieved", { systems: systems.length, chosenPath: input.chosenPath });
  }
}

type TimeWindow = { since?: string };

export class ProductInsightsService {
  constructor(private readonly repos: RepositorySet, private readonly library: SystemLibraryService) {}
  private inWindow<T extends { createdAt: string }>(rows: T[], window?: TimeWindow) {
    if (!window?.since) return rows;
    const since = new Date(window.since).getTime();
    return rows.filter((r) => new Date(r.createdAt).getTime() >= since);
  }
  async summary(ctx: AppContext, window?: TimeWindow) {
    const signals = this.inWindow(await this.repos.audits.list(ctx.workspaceId, { actionPrefix: "signal." }), window);
    const protocol = this.inWindow(await this.repos.audits.list(ctx.workspaceId, { actionPrefix: "protocol." }), window);
    const counts = new Map<string, number>();
    for (const signal of signals) counts.set(signal.action, (counts.get(signal.action) ?? 0) + 1);
    const signalCount = (name: string) => counts.get(`signal.${name}`) ?? 0;
    return {
      activation: {
        onboardingStarted: signalCount("onboarding_started"),
        onboardingCompleted: signalCount("onboarding_completed"),
        firstSystemCreated: signalCount("first_system_created"),
        activationAchieved: signalCount("activation_achieved")
      },
      product: {
        searchUsed: signalCount("dashboard_search_used"),
        searchNoResults: signalCount("search_no_results"),
        editorCrashBoundary: signalCount("editor_crash_boundary_triggered"),
        autosaveFailure: signalCount("autosave_failure"),
        templateCommitted: signalCount("first_template_instantiated"),
        aiDraftCommitted: signalCount("first_ai_generated_system_committed")
      },
      protocol: {
        tokenCreated: signalCount("token_created"),
        writesByAgent: protocol.filter((p) => p.actorType === "agent").length,
        totalProtocolWrites: protocol.length
      },
      failures: {
        importMergeAttempted: signalCount("import_merge_attempted"),
        importMergeConflicts: signalCount("import_merge_conflict_encountered"),
        autosaveFailure: signalCount("autosave_failure"),
        editorCrashBoundary: signalCount("editor_crash_boundary_triggered")
      },
      retention: {
        systemsReopened: signalCount("system_reopened_from_recents"),
        favoritesAdded: signalCount("favorite_added"),
        archiveUsed: signalCount("archive_used")
      },
      rates: {
        searchNoResultRate: signalCount("dashboard_search_used") > 0 ? signalCount("search_no_results") / signalCount("dashboard_search_used") : 0
      },
      recentSignalCounts: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([event, count]) => ({ event, count })),
      recentSignals: signals.slice(-50).reverse()
    };
  }
  async groupedFailures(ctx: AppContext, window?: TimeWindow) {
    const audits = this.inWindow(await this.repos.audits.list(ctx.workspaceId), window);
    const signals = audits.filter((row) => row.action.startsWith("signal."));
    const signalCount = (event: string) => signals.filter((row) => row.action === `signal.${event}`).length;
    const protocol = audits.filter((row) => row.action.startsWith("protocol."));
    return [
      { key: "signup_auth_failures", label: "Signup/Auth failures", count: audits.filter((row) => row.action.startsWith("auth.") && row.outcome === "failure").length, examples: audits.filter((row) => row.action.startsWith("auth.") && row.outcome === "failure").slice(0, 3).map((row) => row.action) },
      { key: "onboarding_dropoff", label: "Onboarding dropoff", count: Math.max(0, signalCount("onboarding_started") - signalCount("onboarding_completed")), examples: ["signal.onboarding_started", "signal.onboarding_completed"] },
      { key: "editor_reliability", label: "Editor reliability failures", count: signalCount("editor_crash_boundary_triggered") + signalCount("autosave_failure"), examples: ["signal.editor_crash_boundary_triggered", "signal.autosave_failure"] },
      { key: "ai_generation_parse", label: "AI generation/parse failures", count: audits.filter((row) => row.action.startsWith("ai.") && row.outcome === "failure").length, examples: audits.filter((row) => row.action.startsWith("ai.") && row.outcome === "failure").slice(0, 3).map((row) => row.action) },
      { key: "import_merge", label: "Import merge failures", count: signalCount("import_merge_conflict_encountered"), examples: ["signal.import_merge_conflict_encountered"] },
      { key: "invite_collaboration", label: "Invite/collaboration failures", count: audits.filter((row) => (row.action.startsWith("invite.") || row.action.startsWith("collaboration.")) && row.outcome === "failure").length, examples: audits.filter((row) => (row.action.startsWith("invite.") || row.action.startsWith("collaboration.")) && row.outcome === "failure").slice(0, 3).map((row) => row.action) },
      { key: "billing_failures", label: "Billing failures", count: audits.filter((row) => row.action.startsWith("billing.") && row.outcome === "failure").length, examples: audits.filter((row) => row.action.startsWith("billing.") && row.outcome === "failure").slice(0, 3).map((row) => row.action) },
      { key: "protocol_failures", label: "Protocol auth/rate/write failures", count: protocol.filter((row) => row.outcome === "failure").length, examples: protocol.filter((row) => row.outcome === "failure").slice(0, 3).map((row) => row.action) }
    ];
  }
  async workspaceHealth(ctx: AppContext) {
    const library = await this.library.query(ctx, { status: "active", sort: "recent_activity" });
    return {
      activeSystems: library.rows.length,
      favorites: library.rows.filter((r) => r.favorite).length,
      taggedSystems: library.rows.filter((r) => r.tags.length > 0).length,
      recentReopens: library.recent.length
    };
  }
}

export class AdminSupportService {
  constructor(private readonly repos: RepositorySet, private readonly systems: SystemService, private readonly insights: ProductInsightsService, private readonly library: SystemLibraryService) {}
  async inspectWorkspace(ctx: AppContext) {
    const [plan, systems, invites, tokens, audits, health, signals] = await Promise.all([
      this.repos.entitlements.getPlanState(ctx.workspaceId),
      this.systems.listAll(ctx),
      this.repos.invites.list(ctx.workspaceId),
      this.repos.agentTokens.list(ctx.workspaceId),
      this.repos.audits.list(ctx.workspaceId).then((rows) => rows.slice(-20).reverse()),
      this.insights.workspaceHealth(ctx),
      this.repos.audits.list(ctx.workspaceId, { actionPrefix: "signal." }).then((rows) => rows.slice(-20).reverse())
    ]);
    return { workspaceId: ctx.workspaceId, plan, systems, invites, tokens, recentAudits: audits, recentSignals: signals, health };
  }
  async inspectSystem(ctx: AppContext, systemId: string) {
    const [bundle, library] = await Promise.all([this.systems.getBundle(ctx, systemId), this.library.query(ctx, { status: "active" })]);
    const row = library.rows.find((r) => r.id === systemId);
    return { bundle, library: row ?? null };
  }
  async findUserByEmail(_: AppContext, email: string) {
    return this.repos.users.findByEmail(email);
  }
  async findUser(ctx: AppContext, input: { email?: string; userId?: string }) {
    if (input.email) return this.findUserByEmail(ctx, input.email);
    if (input.userId) {
      const audits = await this.repos.audits.list(ctx.workspaceId, { actorId: input.userId, limit: 1 });
      if (audits.length === 0) return null;
      return { id: input.userId, email: "unknown", name: "Unknown" };
    }
    return null;
  }
}

const FEEDBACK_CATEGORIES: FeedbackCategory[] = ["bug", "ux", "feature_request", "reliability", "billing", "other"];
const FEEDBACK_SEVERITY: FeedbackSeverity[] = ["low", "medium", "high"];
const FEEDBACK_STATUS: FeedbackStatus[] = ["new", "reviewing", "closed"];

export class FeedbackService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService) {}
  private validate(input: { category: string; severity: string; summary: string; details?: string; page?: string; systemId?: string; userEmail?: string }) {
    if (!FEEDBACK_CATEGORIES.includes(input.category as FeedbackCategory)) throw new Error("Invalid feedback category.");
    if (!FEEDBACK_SEVERITY.includes(input.severity as FeedbackSeverity)) throw new Error("Invalid feedback severity.");
    if (input.summary.trim().length < 8) throw new Error("Feedback summary must be at least 8 characters.");
    if ((input.details ?? "").trim().length > 2000) throw new Error("Feedback details must be 2000 characters or less.");
    if ((input.page ?? "").trim().length > 120) throw new Error("Feedback page must be 120 characters or less.");
    if (input.systemId && !/^[a-zA-Z0-9_-]{3,80}$/.test(input.systemId)) throw new Error("Feedback systemId format is invalid.");
  }
  async create(ctx: AppContext, input: { category: FeedbackCategory; severity: FeedbackSeverity; summary: string; details?: string; page?: string; systemId?: string; userEmail?: string }) {
    this.access.ensureCanView(ctx);
    this.validate(input);
    const created = await this.repos.feedback.create({
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      category: input.category,
      severity: input.severity,
      summary: input.summary.trim(),
      details: (input.details ?? "").trim(),
      page: input.page?.trim() || "/dashboard",
      systemId: input.systemId,
      userEmail: input.userEmail
    });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "feedback.submitted", targetType: "feedback", targetId: created.id, outcome: "success", metadata: JSON.stringify({ category: input.category, severity: input.severity }) });
    return created;
  }
  async list(ctx: AppContext, filter?: { status?: FeedbackStatus; category?: FeedbackCategory; limit?: number }) {
    this.access.ensureCanManageMembers(ctx);
    return this.repos.feedback.list(ctx.workspaceId, filter);
  }
  async updateStatus(ctx: AppContext, input: { id: string; status: FeedbackStatus }) {
    this.access.ensureCanManageMembers(ctx);
    if (!FEEDBACK_STATUS.includes(input.status)) throw new Error("Invalid feedback status.");
    await this.repos.feedback.updateStatus({ workspaceId: ctx.workspaceId, id: input.id, status: input.status, updatedBy: ctx.userId });
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "feedback.status_updated",
      targetType: "feedback",
      targetId: input.id,
      outcome: "success",
      metadata: JSON.stringify({ status: input.status })
    });
  }
}

export class IssueTriageService {
  constructor(private readonly feedback: FeedbackService, private readonly insights: ProductInsightsService) {}
  async list(ctx: AppContext, filter?: { status?: FeedbackStatus; category?: FeedbackCategory; limit?: number }) {
    const [items, failureGroups] = await Promise.all([this.feedback.list(ctx, filter), this.insights.groupedFailures(ctx)]);
    return { items, failureGroups, openCount: items.filter((item) => item.status !== "closed").length };
  }
}

export class ReleaseReviewService {
  constructor(private readonly repos: RepositorySet, private readonly insights: ProductInsightsService, private readonly triage: IssueTriageService) {}
  async summary(ctx: AppContext, input?: { since?: string }) {
    const [plan, audits, issueSummary, groupedFailures] = await Promise.all([
      this.repos.entitlements.getPlanState(ctx.workspaceId),
      this.repos.audits.list(ctx.workspaceId, { since: input?.since, limit: 400 }),
      this.triage.list(ctx, { limit: 100 }),
      this.insights.groupedFailures(ctx, { since: input?.since })
    ]);
    const protocolFailures = audits.filter((row) => row.action.startsWith("protocol.") && row.outcome === "failure").slice(0, 8);
    const signal = (event: string) => audits.filter((row) => row.action === `signal.${event}`).length;
    const runtime = resolveRuntimeMode();
    return {
      environment: { workspaceId: ctx.workspaceId, plan: plan.plan, billingStatus: plan.status, runtimeMode: runtime.mode, configurationWarning: runtime.warning ?? null, providerReadiness: { convexConfigured: !!env.CONVEX_URL, authConfigured: !!env.AUTH0_DOMAIN, billingConfigured: !!env.CREEM_API_KEY, aiConfigured: !!env.OPENAI_API_KEY } },
      checklist: {
        criticalFlows: [
          { key: "signup_onboarding", route: "/signup -> /onboarding", status: "review" },
          { key: "template_instantiate", route: "/templates/[slug]", status: "review" },
          { key: "ai_commit", route: "/dashboard quick create", status: "review" },
          { key: "invite_flow", route: "/settings/collaboration + /invites/[token]", status: "review" },
          { key: "billing_upgrade", route: "/settings/billing", status: "review" },
          { key: "token_protocol", route: "/settings/tokens + /api/protocol/systems", status: "review" },
          { key: "trust_export", route: "/settings/trust", status: "review" }
        ]
      },
      summaries: {
        failures: groupedFailures,
        protocolErrors: protocolFailures,
        signupActivation: { signupStarted: signal("onboarding_started"), onboardingCompleted: signal("onboarding_completed"), activationAchieved: signal("activation_achieved") },
        editorReliability: { editorCrashBoundary: signal("editor_crash_boundary_triggered"), autosaveFailure: signal("autosave_failure") },
        inviteAndBilling: {
          inviteAccepted: signal("invite_accepted"),
          inviteFailures: audits.filter((row) => row.action.startsWith("invite.") && row.outcome === "failure").length,
          billingFailures: audits.filter((row) => row.action.startsWith("billing.") && row.outcome === "failure").length
        }
      },
      issues: issueSummary,
      links: [
        { label: "Admin support", href: "/admin" },
        { label: "Admin insights", href: "/admin/insights" },
        { label: "Admin issues", href: "/admin/issues" },
        { label: "Settings audit", href: "/settings/audit" },
        { label: "Settings trust", href: "/settings/trust" },
        { label: "QA checklist", href: "/docs" }
      ]
    };
  }
}

type EnterpriseAuthSettings = {
  mode: "shared" | "sso_ready";
  allowedDomains: string[];
  auth0Connection?: string;
  enforceDomainMatch: boolean;
};

type RetentionPolicy = {
  archivedSystemRetentionDays: number;
  inviteExpiryDays: number;
  staleTokenDays: number;
  auditRetentionDays: number;
  signalRetentionDays: number;
};

export class WorkspaceGovernanceService {
  constructor(private readonly repos: RepositorySet, private readonly access: AccessService, private readonly systems: SystemService) {}
  private async latestSettings<T>(ctx: AppContext, action: string, fallback: T): Promise<T> {
    const rows = await this.repos.audits.list(ctx.workspaceId, { actionPrefix: action, limit: 1 });
    if (rows.length === 0) return fallback;
    try {
      return { ...fallback, ...JSON.parse(rows[0].metadata ?? "{}") } as T;
    } catch {
      return fallback;
    }
  }
  private validateDomains(domains: string[]) {
    for (const domain of domains) {
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error(`Invalid domain: ${domain}`);
    }
  }
  async getTrustSettings(ctx: AppContext) {
    this.access.ensureCanManageMembers(ctx);
    const authDefaults: EnterpriseAuthSettings = { mode: "shared", allowedDomains: [], enforceDomainMatch: false };
    const retentionDefaults: RetentionPolicy = { archivedSystemRetentionDays: 365, inviteExpiryDays: 7, staleTokenDays: 90, auditRetentionDays: 365, signalRetentionDays: 365 };
    const [auth, retention, workspaceState] = await Promise.all([
      this.latestSettings(ctx, "governance.auth_settings.updated", authDefaults),
      this.latestSettings(ctx, "governance.retention_policy.updated", retentionDefaults),
      this.latestSettings(ctx, "governance.workspace_state.updated", { state: "active", reason: null as string | null })
    ]);
    return {
      auth,
      retention,
      workspaceState,
      deletionSemantics: {
        systems: "archive_restore_supported",
        systemHardDelete: "not_supported",
        workspaceDelete: "not_supported",
        workspaceClose: "deactivate_supported"
      }
    };
  }
  async updateEnterpriseAuth(ctx: AppContext, input: EnterpriseAuthSettings) {
    this.access.ensureCanManageMembers(ctx);
    this.validateDomains(input.allowedDomains ?? []);
    if (input.mode === "sso_ready" && !input.auth0Connection) throw new Error("Auth0 connection is required for sso_ready mode.");
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "governance.auth_settings.updated",
      targetType: "workspace",
      targetId: ctx.workspaceId,
      outcome: "success",
      metadata: JSON.stringify(input)
    });
    return this.getTrustSettings(ctx);
  }
  async updateRetentionPolicy(ctx: AppContext, input: RetentionPolicy) {
    this.access.ensureCanManageMembers(ctx);
    if (input.archivedSystemRetentionDays < 30) throw new Error("archivedSystemRetentionDays must be >= 30.");
    if (input.inviteExpiryDays < 1 || input.inviteExpiryDays > 30) throw new Error("inviteExpiryDays must be between 1 and 30.");
    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "governance.retention_policy.updated",
      targetType: "workspace",
      targetId: ctx.workspaceId,
      outcome: "success",
      metadata: JSON.stringify(input)
    });
    return this.getTrustSettings(ctx);
  }
  async workspaceExportManifest(ctx: AppContext) {
    this.access.ensureCanManageMembers(ctx);
    const systems = await this.systems.listAll(ctx);
    const manifest = {
      exportVersion: "workspace_manifest_v1",
      schemaVersion: "pipes_schema_v1",
      exportedAt: new Date().toISOString(),
      workspace: { id: ctx.workspaceId, plan: ctx.plan },
      systems: systems.map((system) => ({ id: system.id, name: system.name, updatedAt: system.updatedAt, archivedAt: system.archivedAt ?? null, schemaExportPath: `/api/systems/${system.id}/export?format=json` }))
    };
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "governance.workspace_exported", targetType: "workspace", targetId: ctx.workspaceId, outcome: "success", metadata: JSON.stringify({ systemCount: systems.length, exportVersion: manifest.exportVersion }) });
    return manifest;
  }
  async deactivateWorkspace(ctx: AppContext, reason: string, confirmation: string) {
    this.access.ensureCanManageMembers(ctx);
    if (ctx.role !== "Owner") throw new Error("Only workspace owners can deactivate workspace state.");
    if (confirmation !== "DEACTIVATE") throw new Error("Confirmation phrase mismatch.");
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "governance.workspace_state.updated", targetType: "workspace", targetId: ctx.workspaceId, outcome: "success", metadata: JSON.stringify({ state: "deactivated", reason }) });
    return this.getTrustSettings(ctx);
  }
  async reactivateWorkspace(ctx: AppContext) {
    this.access.ensureCanManageMembers(ctx);
    if (ctx.role !== "Owner") throw new Error("Only workspace owners can reactivate workspace state.");
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "governance.workspace_state.updated", targetType: "workspace", targetId: ctx.workspaceId, outcome: "success", metadata: JSON.stringify({ state: "active", reason: null }) });
    return this.getTrustSettings(ctx);
  }
  async memberDirectory(ctx: AppContext, filter?: { q?: string; role?: Role | "all"; includeInvites?: boolean }) {
    this.access.ensureCanManageMembers(ctx);
    const [members, invites] = await Promise.all([this.repos.memberships.list(ctx.workspaceId), this.repos.invites.list(ctx.workspaceId)]);
    const q = String(filter?.q ?? "").toLowerCase().trim();
    const roleFilter = filter?.role && filter.role !== "all" ? filter.role : undefined;
    let memberRows = members.map((m) => ({ ...m, kind: "member" as const }));
    if (roleFilter) memberRows = memberRows.filter((m) => m.role === roleFilter);
    if (q) memberRows = memberRows.filter((m) => `${m.userId} ${m.role}`.toLowerCase().includes(q));
    let inviteRows = invites;
    if (roleFilter) inviteRows = inviteRows.filter((i) => i.role === roleFilter);
    if (q) inviteRows = inviteRows.filter((i) => `${i.email} ${i.role} ${i.status}`.toLowerCase().includes(q));
    return { members: memberRows, invites: filter?.includeInvites === false ? [] : inviteRows };
  }
}

export function createBoundedServices(repos: RepositorySet) {
  const access = new AccessService();
  const entitlements = new EntitlementService(repos);
  const systems = new SystemService(repos, access, entitlements);
  const graph = new GraphService(repos, access);
  const schema = new SchemaExportService(repos, access);
  const versions = new VersionService(repos, access, schema, entitlements);
  const signals = new ProductSignalService(repos);
  const templates = new TemplateService(systems, graph, repos, signals);
  const library = new SystemLibraryService(systems, repos, access, signals);
  const onboarding = new OnboardingService(templates, systems, signals);
  const insights = new ProductInsightsService(repos, library);
  const admin = new AdminSupportService(repos, systems, insights, library);
  const feedback = new FeedbackService(repos, access);
  const triage = new IssueTriageService(feedback, insights);
  const release = new ReleaseReviewService(repos, insights, triage);
  const governance = new WorkspaceGovernanceService(repos, access, systems);
  return {
    access,
    entitlements,
    workspace: new WorkspaceService(repos),
    systems,
    graph,
    comments: new CommentService(repos, access),
    versions,
    collaboration: new CollaborationService(repos, access, entitlements),
    presence: new PresenceService(repos, access),
    billing: new BillingService(repos, access),
    schema,
    templates,
    library,
    onboarding,
    insights,
    admin,
    feedback,
    triage,
    release,
    governance,
    signals,
    ai: new AiGenerationService(systems, graph, versions, entitlements, signals, repos),
    importExport: new ImportExportService(systems, graph, versions, schema, signals),
    protocol: new ProtocolService(repos, access)
    ,guards: new ProtocolGuardService(repos)
  };
}

export type ServiceSet = ReturnType<typeof createBoundedServices>;
