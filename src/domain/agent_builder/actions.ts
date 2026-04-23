import { z } from "zod";

export const GraphActionTypeSchema = z.enum([
  "add_node",
  "update_node",
  "move_node",
  "delete_node",
  "add_pipe",
  "delete_pipe",
  "add_annotation",
  "update_annotation",
  "create_group",
  "update_group",
  "create_version_checkpoint",
  "request_review",
  "no_op_explanation"
]);
export type GraphActionType = z.infer<typeof GraphActionTypeSchema>;

export const GraphActionRiskClassSchema = z.enum(["safe_auto_apply", "review_required", "forbidden"]);
export type GraphActionRiskClass = z.infer<typeof GraphActionRiskClassSchema>;

export const GraphActionApplyModeSchema = z.enum(["auto_apply", "hold_for_review", "never_apply"]);
export type GraphActionApplyMode = z.infer<typeof GraphActionApplyModeSchema>;

export const GraphActionValidationStatusSchema = z.enum(["valid", "invalid", "unsupported"]);
export type GraphActionValidationStatus = z.infer<typeof GraphActionValidationStatusSchema>;

export const GraphActionActorSchema = z.object({
  actorType: z.enum(["user", "agent"]),
  actorId: z.string(),
  workspaceId: z.string()
});

const PositionSchema = z.object({ x: z.number(), y: z.number() });

export const GraphActionPayloadSchema = z.discriminatedUnion("actionType", [
  z.object({ actionType: z.literal("add_node"), nodeType: z.string(), title: z.string(), description: z.string().optional(), position: PositionSchema }),
  z.object({ actionType: z.literal("update_node"), nodeId: z.string(), title: z.string().optional(), description: z.string().optional(), metadataOnly: z.boolean().default(true) }),
  z.object({ actionType: z.literal("move_node"), nodeId: z.string(), position: PositionSchema }),
  z.object({ actionType: z.literal("delete_node"), nodeId: z.string() }),
  z.object({ actionType: z.literal("add_pipe"), fromNodeId: z.string(), toNodeId: z.string() }),
  z.object({ actionType: z.literal("delete_pipe"), pipeId: z.string() }),
  z.object({ actionType: z.literal("add_annotation"), body: z.string(), nodeId: z.string().optional() }),
  z.object({ actionType: z.literal("update_annotation"), annotationId: z.string(), body: z.string() }),
  z.object({ actionType: z.literal("create_group"), title: z.string(), nodeIds: z.array(z.string()).min(1) }),
  z.object({ actionType: z.literal("update_group"), groupId: z.string(), title: z.string().optional(), nodeIds: z.array(z.string()).optional() }),
  z.object({ actionType: z.literal("create_version_checkpoint"), name: z.string() }),
  z.object({ actionType: z.literal("request_review"), reason: z.string() }),
  z.object({ actionType: z.literal("no_op_explanation"), message: z.string() })
]);

export const GraphActionProposalStatusSchema = z.enum([
  "proposed",
  "pending_review",
  "approved",
  "rejected",
  "applied",
  "apply_failed",
  "forbidden"
]);
export type GraphActionProposalStatus = z.infer<typeof GraphActionProposalStatusSchema>;

export const GraphActionProposalSchema = z.object({
  id: z.string(),
  runId: z.string(),
  sessionId: z.string(),
  workspaceId: z.string(),
  targetSystemId: z.string(),
  actionId: z.string(),
  actionType: GraphActionTypeSchema,
  actor: GraphActionActorSchema,
  payload: GraphActionPayloadSchema,
  rationale: z.string(),
  riskClass: GraphActionRiskClassSchema,
  applyMode: GraphActionApplyModeSchema,
  sequence: z.number(),
  validationStatus: GraphActionValidationStatusSchema,
  status: GraphActionProposalStatusSchema,
  proposedAt: z.string(),
  appliedAt: z.string().optional(),
  reviewDecision: z.object({ decision: z.enum(["approved", "rejected"]), by: z.string(), at: z.string(), note: z.string().optional() }).optional(),
  error: z.string().optional()
});

export const AppliedGraphActionRecordSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  runId: z.string(),
  sessionId: z.string(),
  workspaceId: z.string(),
  targetSystemId: z.string(),
  actionType: GraphActionTypeSchema,
  appliedAt: z.string(),
  validationIssueCount: z.number().default(0),
  versionCheckpointId: z.string().optional()
});

export const GraphActionBatchSchema = z.object({
  runId: z.string(),
  actions: z.array(GraphActionPayloadSchema).min(1)
});

export type GraphActionProposal = z.infer<typeof GraphActionProposalSchema>;
export type AppliedGraphActionRecord = z.infer<typeof AppliedGraphActionRecordSchema>;
export type GraphActionPayload = z.infer<typeof GraphActionPayloadSchema>;

export function classifyRisk(payload: GraphActionPayload): GraphActionRiskClass {
  switch (payload.actionType) {
    case "add_annotation":
    case "move_node":
      return "safe_auto_apply";
    case "add_node":
      return payload.nodeType === "Annotation" ? "safe_auto_apply" : "review_required";
    case "update_node":
      return payload.metadataOnly ? "safe_auto_apply" : "review_required";
    case "delete_node":
    case "delete_pipe":
    case "create_group":
    case "update_group":
      return "review_required";
    case "update_annotation":
    case "create_version_checkpoint":
    case "request_review":
    case "no_op_explanation":
      return "safe_auto_apply";
    default:
      return "forbidden";
  }
}

export function riskToApplyMode(risk: GraphActionRiskClass): GraphActionApplyMode {
  if (risk === "safe_auto_apply") return "auto_apply";
  if (risk === "review_required") return "hold_for_review";
  return "never_apply";
}
