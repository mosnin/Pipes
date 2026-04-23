import type { PipesSchemaDocument } from "@/domain/pipes_schema_v1/schema";

export const sampleSystemId = "sys_support_router";

export const sampleData: PipesSchemaDocument = {
  version: "pipes_schema_v1",
  users: [
    { id: "usr_1", email: "owner@pipes.local", name: "Alex Rivera", createdAt: "2026-01-01T00:00:00.000Z" }
  ],
  workspaces: [
    { id: "wks_1", name: "Pipes Lab", slug: "pipes-lab", ownerId: "usr_1", plan: "Pro", createdAt: "2026-01-01T00:00:00.000Z" }
  ],
  systems: [
    {
      id: sampleSystemId,
      workspaceId: "wks_1",
      name: "Support Triage Router",
      description: "Routes customer intake across model, guardrails, and human approval.",
      createdBy: "usr_1",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
      nodeIds: ["n_input", "n_classifier", "n_guardrail", "n_approval", "n_output", "n_unlinked"],
      portIds: ["p_in_out", "p_cls_in", "p_cls_out", "p_guard_in", "p_guard_out", "p_approve_in", "p_approve_out", "p_out_in"],
      pipeIds: ["pipe_1", "pipe_2", "pipe_3", "pipe_4"],
      groupIds: [],
      annotationIds: [],
      commentIds: ["c_1"],
      assetIds: ["a_1"],
      snippetIds: ["sn_1"],
      subsystemNodeIds: []
    }
  ],
  views: [{ id: "v_1", systemId: sampleSystemId, name: "Default", nodeIds: ["n_input", "n_classifier", "n_guardrail", "n_approval", "n_output"], createdAt: "2026-01-02T00:00:00.000Z" }],
  nodes: [
    { id: "n_input", systemId: sampleSystemId, type: "Input", title: "Inbound Request", position: { x: 40, y: 220 }, config: {}, portIds: ["p_in_out"] },
    { id: "n_classifier", systemId: sampleSystemId, type: "Agent", title: "Intent Classifier", position: { x: 300, y: 220 }, config: { model: "gpt-4.1-mini" }, portIds: ["p_cls_in", "p_cls_out"] },
    { id: "n_guardrail", systemId: sampleSystemId, type: "Guardrail", title: "PII Guard", position: { x: 560, y: 220 }, config: {}, portIds: ["p_guard_in", "p_guard_out"] },
    { id: "n_approval", systemId: sampleSystemId, type: "HumanApproval", title: "Escalation Review", position: { x: 820, y: 220 }, config: {}, portIds: ["p_approve_in", "p_approve_out"] },
    { id: "n_output", systemId: sampleSystemId, type: "Output", title: "Final Response", position: { x: 1080, y: 220 }, config: {}, portIds: ["p_out_in"] },
    { id: "n_unlinked", systemId: sampleSystemId, type: "Subsystem", title: "Reusable Billing Flow", position: { x: 560, y: 460 }, config: {}, portIds: [] }
  ],
  ports: [
    { id: "p_in_out", nodeId: "n_input", key: "request", label: "request", direction: "output", dataType: "json", required: true },
    { id: "p_cls_in", nodeId: "n_classifier", key: "request", label: "request", direction: "input", dataType: "json", required: true },
    { id: "p_cls_out", nodeId: "n_classifier", key: "intent", label: "intent", direction: "output", dataType: "string", required: true },
    { id: "p_guard_in", nodeId: "n_guardrail", key: "intent", label: "intent", direction: "input", dataType: "string", required: true },
    { id: "p_guard_out", nodeId: "n_guardrail", key: "sanitized", label: "sanitized", direction: "output", dataType: "json", required: true },
    { id: "p_approve_in", nodeId: "n_approval", key: "payload", label: "payload", direction: "input", dataType: "json", required: true },
    { id: "p_approve_out", nodeId: "n_approval", key: "approved", label: "approved", direction: "output", dataType: "json", required: true },
    { id: "p_out_in", nodeId: "n_output", key: "response", label: "response", direction: "input", dataType: "json", required: true }
  ],
  pipes: [
    { id: "pipe_1", systemId: sampleSystemId, fromPortId: "p_in_out", toPortId: "p_cls_in" },
    { id: "pipe_2", systemId: sampleSystemId, fromPortId: "p_cls_out", toPortId: "p_guard_in" },
    { id: "pipe_3", systemId: sampleSystemId, fromPortId: "p_guard_out", toPortId: "p_approve_in" },
    { id: "pipe_4", systemId: sampleSystemId, fromPortId: "p_approve_out", toPortId: "p_out_in" }
  ],
  groups: [],
  annotations: [],
  comments: [
    { id: "c_1", systemId: sampleSystemId, authorId: "usr_1", body: "Need latency budget targets on this path.", targets: [{ type: "Node", id: "n_classifier" }], createdAt: "2026-01-03T00:00:00.000Z" }
  ],
  assets: [{ id: "a_1", systemId: sampleSystemId, type: "doc", name: "support-policy.md", uri: "local://assets/support-policy.md" }],
  snippets: [{ id: "sn_1", systemId: sampleSystemId, language: "json", content: "{\"escalation\": true}" }],
  templates: [{ id: "tpl_1", workspaceId: "wks_1", name: "Support Router", description: "Customer support triage baseline", sourceSystemId: sampleSystemId, tags: ["support", "router"] }],
  versions: [{ id: "ver_1", systemId: sampleSystemId, name: "v0.1 foundation", createdBy: "usr_1", createdAt: "2026-01-10T00:00:00.000Z", snapshot: "{}" }],
  invites: [{ id: "inv_1", workspaceId: "wks_1", email: "ops@pipes.local", role: "Editor", token: "invite-token", expiresAt: "2026-12-30T00:00:00.000Z" }],
  roles: [{ workspaceId: "wks_1", userId: "usr_1", role: "Owner" }],
  agentTokens: [{ id: "agt_1", workspaceId: "wks_1", name: "CI Reader", tokenPreview: "ptk_****", capabilities: ["systems:read"], createdAt: "2026-01-05T00:00:00.000Z" }],
  validationReports: [],
  simulationRuns: []
};

export const sampleSystem = sampleData.systems[0];
