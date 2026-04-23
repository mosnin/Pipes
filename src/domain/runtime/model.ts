import { z } from "zod";

export const RuntimeExecutionTargetSchema = z.enum(["inline_host", "modal_worker", "modal_sandbox"]);
export const SandboxRequirementSchema = z.enum(["none", "preferred", "required"]);
export const WorkerCapabilitySchema = z.enum(["basic_analysis", "tool_heavy", "long_running", "artifact_assembly", "sandboxed_io"]);

export const RuntimeRoutingDecisionSchema = z.object({
  id: z.string(),
  runId: z.string(),
  taskId: z.string(),
  workspaceId: z.string(),
  target: RuntimeExecutionTargetSchema,
  reason: z.string(),
  sandboxRequirement: SandboxRequirementSchema,
  requiredCapabilities: z.array(WorkerCapabilitySchema).default([]),
  createdAt: z.string()
});

export const TaskExecutionRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  taskId: z.string(),
  workspaceId: z.string(),
  target: RuntimeExecutionTargetSchema,
  lifecycle: z.enum(["queued", "dispatched", "running", "completed", "failed", "canceled"]),
  note: z.string().optional(),
  createdAt: z.string()
});

export type RuntimeExecutionTarget = z.infer<typeof RuntimeExecutionTargetSchema>;
export type SandboxRequirement = z.infer<typeof SandboxRequirementSchema>;
export type WorkerCapability = z.infer<typeof WorkerCapabilitySchema>;
export type RuntimeRoutingDecision = z.infer<typeof RuntimeRoutingDecisionSchema>;
export type TaskExecutionRecord = z.infer<typeof TaskExecutionRecordSchema>;
