import { z } from "zod";

export const SubsystemBlueprintSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  sourceSystemId: z.string(),
  sourceNodeId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  nodeCount: z.number(),
  pipeCount: z.number(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    x: z.number(),
    y: z.number(),
    config: z.record(z.string(), z.unknown()).default({}),
  })),
  pipes: z.array(z.object({
    fromNodeId: z.string(),
    toNodeId: z.string(),
    label: z.string().optional(),
  })),
  inboundPorts: z.array(z.string()),
  outboundPorts: z.array(z.string()),
  createdAt: z.string(),
  createdBy: z.string(),
  tags: z.array(z.string()).default([]),
});

export type SubsystemBlueprint = z.infer<typeof SubsystemBlueprintSchema>;
