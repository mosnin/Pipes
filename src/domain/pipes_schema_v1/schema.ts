import { z } from "zod";

export const PIPES_SCHEMA_VERSION = 1 as const;
export type PipesSchemaVersion = typeof PIPES_SCHEMA_VERSION;

export const nodeTypeValues = [
  "Node",
  "Agent",
  "Tool",
  "Model",
  "Prompt",
  "Memory",
  "Input",
  "Output",
  "Action",
  "Decision",
  "Condition",
  "Router",
  "Loop",
  "Queue",
  "Datastore",
  "ExternalApi",
  "HumanApproval",
  "Guardrail",
  "Monitor",
  "Trigger",
  "Schedule",
  "Environment",
  "Subsystem",
  "Reference",
  "Annotation"
] as const;

export const DEFAULT_NODE_TYPE = "Node" as const;

export function isLegacyNodeType(type: string): boolean {
  return (nodeTypeValues as readonly string[]).includes(type) && type !== DEFAULT_NODE_TYPE;
}

export const roleValues = ["Owner", "Admin", "Editor", "Commenter", "Viewer"] as const;
export const planValues = ["Free", "Pro", "Builder"] as const;

const id = z.string().min(3);
const isoDate = z.string().datetime();

export const RoleSchema = z.enum(roleValues);
export const PlanSchema = z.enum(planValues);
export const NodeTypeSchema = z.enum(nodeTypeValues);
export const PortDirectionSchema = z.enum(["input", "output"]);
export const PortDataTypeSchema = z.enum(["string", "number", "boolean", "json", "event", "file", "any"]);

export const UserSchema = z.object({
  id,
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().optional(),
  createdAt: isoDate
});

export const WorkspaceSchema = z.object({
  id,
  name: z.string(),
  slug: z.string(),
  ownerId: id,
  plan: PlanSchema,
  createdAt: isoDate
});

export const PortSchema = z.object({
  id,
  nodeId: id,
  key: z.string(),
  label: z.string(),
  direction: PortDirectionSchema,
  dataType: PortDataTypeSchema,
  required: z.boolean().default(false)
});

export const NodeSchema = z.object({
  id,
  systemId: id,
  type: NodeTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.string(), z.unknown()).default({}),
  portIds: z.array(id).default([]),
  parentSubsystemNodeId: id.optional()
});

export const PipeSchema = z.object({
  id,
  systemId: id,
  fromPortId: id,
  toPortId: id,
  label: z.string().optional()
});

export const GroupSchema = z.object({
  id,
  systemId: id,
  title: z.string(),
  nodeIds: z.array(id).default([])
});

export const AnnotationSchema = z.object({
  id,
  systemId: id,
  authorId: id,
  text: z.string(),
  x: z.number(),
  y: z.number(),
  createdAt: isoDate
});

export const CommentTargetSchema = z.object({
  type: z.enum(["System", "View", "Node", "Pipe", "Annotation"]),
  id
});

export const CommentSchema = z.object({
  id,
  systemId: id,
  authorId: id,
  body: z.string(),
  targets: z.array(CommentTargetSchema).min(1),
  createdAt: isoDate
});

export const AssetSchema = z.object({
  id,
  systemId: id,
  nodeId: id.optional(),
  type: z.enum(["file", "image", "doc", "json"]),
  name: z.string(),
  uri: z.string()
});

export const SnippetSchema = z.object({
  id,
  systemId: id,
  nodeId: id.optional(),
  language: z.string(),
  content: z.string()
});

export const TemplateSchema = z.object({
  id,
  workspaceId: id,
  name: z.string(),
  description: z.string(),
  sourceSystemId: id,
  tags: z.array(z.string()).default([])
});

export const VersionSchema = z.object({
  id,
  systemId: id,
  name: z.string(),
  createdBy: id,
  createdAt: isoDate,
  snapshot: z.string()
});

export const InviteSchema = z.object({
  id,
  workspaceId: id,
  email: z.string().email(),
  role: RoleSchema,
  token: z.string(),
  expiresAt: isoDate
});

export const AgentTokenSchema = z.object({
  id,
  workspaceId: id,
  name: z.string(),
  tokenPreview: z.string(),
  capabilities: z.array(z.string()),
  systemId: id.optional(),
  createdAt: isoDate,
  lastUsedAt: isoDate.optional(),
  revokedAt: isoDate.optional()
});

export const ViewSchema = z.object({
  id,
  systemId: id,
  name: z.string(),
  nodeIds: z.array(id).default([]),
  createdAt: isoDate
});

export const ValidationSeveritySchema = z.enum(["info", "warning", "error"]);
export const ValidationIssueSchema = z.object({
  id,
  systemId: id,
  severity: ValidationSeveritySchema,
  code: z.string(),
  message: z.string(),
  nodeId: id.optional(),
  pipeId: id.optional()
});

export const ValidationReportSchema = z.object({
  id,
  systemId: id,
  generatedAt: isoDate,
  issues: z.array(ValidationIssueSchema),
  isValid: z.boolean()
});

export const SimulationStepSchema = z.object({
  step: z.number(),
  nodeId: id,
  summary: z.string()
});

export const SimulationRunSchema = z.object({
  id,
  systemId: id,
  startedAt: isoDate,
  endedAt: isoDate,
  status: z.enum(["success", "halted", "error"]),
  input: z.record(z.string(), z.unknown()),
  steps: z.array(SimulationStepSchema)
});

export const SystemSchema = z.object({
  id,
  workspaceId: id,
  name: z.string(),
  description: z.string(),
  createdBy: id,
  createdAt: isoDate,
  updatedAt: isoDate,
  nodeIds: z.array(id).default([]),
  portIds: z.array(id).default([]),
  pipeIds: z.array(id).default([]),
  groupIds: z.array(id).default([]),
  annotationIds: z.array(id).default([]),
  commentIds: z.array(id).default([]),
  assetIds: z.array(id).default([]),
  snippetIds: z.array(id).default([]),
  subsystemNodeIds: z.array(id).default([])
});

export const PipesSchemaV1 = z.object({
  version: z.literal("pipes_schema_v1"),
  users: z.array(UserSchema),
  workspaces: z.array(WorkspaceSchema),
  systems: z.array(SystemSchema),
  views: z.array(ViewSchema),
  nodes: z.array(NodeSchema),
  ports: z.array(PortSchema),
  pipes: z.array(PipeSchema),
  groups: z.array(GroupSchema),
  annotations: z.array(AnnotationSchema),
  comments: z.array(CommentSchema),
  assets: z.array(AssetSchema),
  snippets: z.array(SnippetSchema),
  templates: z.array(TemplateSchema),
  versions: z.array(VersionSchema),
  invites: z.array(InviteSchema),
  roles: z.array(
    z.object({
      workspaceId: id,
      userId: id,
      role: RoleSchema
    })
  ),
  agentTokens: z.array(AgentTokenSchema),
  validationReports: z.array(ValidationReportSchema),
  simulationRuns: z.array(SimulationRunSchema)
});

export type Role = z.infer<typeof RoleSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type User = z.infer<typeof UserSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type System = z.infer<typeof SystemSchema>;
export type View = z.infer<typeof ViewSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Port = z.infer<typeof PortSchema>;
export type Pipe = z.infer<typeof PipeSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Snippet = z.infer<typeof SnippetSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type Version = z.infer<typeof VersionSchema>;
export type Invite = z.infer<typeof InviteSchema>;
export type AgentToken = z.infer<typeof AgentTokenSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ValidationReport = z.infer<typeof ValidationReportSchema>;
export type SimulationRun = z.infer<typeof SimulationRunSchema>;
export type PipesSchemaDocument = z.infer<typeof PipesSchemaV1>;
