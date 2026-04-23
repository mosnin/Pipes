export type ContractType = "string" | "number" | "boolean" | "json" | "event" | "file" | "any";

export type FieldContract = {
  id: string;
  key: string;
  type: ContractType;
  required: boolean;
  description?: string;
  example?: string;
  sourceRef?: string;
  mappingExpr?: string;
  transformNotes?: string;
};

export type NodeContract = {
  portType: ContractType;
  summary?: string;
  samplePayload?: string;
  fields: FieldContract[];
};

export type NodeMetadata = {
  summary?: string;
  purpose?: string;
  assumptions?: string;
  failureNotes?: string;
  owner?: string;
  reviewer?: string;
  linkedAsset?: string;
  linkedSnippet?: string;
  implementationNotes?: string;
  docsRef?: string;
};

export type NodeDefinition = {
  nodeId: string;
  nodeType: string;
  overview: NodeMetadata;
  input: NodeContract;
  output: NodeContract;
  configNotes?: string;
  mappingNotes?: string;
  expressionPlaceholders?: string;
  outputContractNotes?: string;
  expectedSources?: string;
  notes?: string;
  updatedAt: number;
};

export type CompatibilityHint = {
  compatible: boolean;
  reason: string;
};

export const DEFAULT_CONTRACT_TYPE_BY_NODE: Record<string, ContractType> = {
  Input: "json",
  Output: "json",
  Agent: "any",
  Model: "string",
  Tool: "json",
  Prompt: "string",
  Memory: "json",
  Datastore: "json",
  Decision: "boolean",
  Router: "event",
  Loop: "event"
};

export function createDefaultNodeDefinition(input: { nodeId: string; nodeType: string; title: string; description?: string }): NodeDefinition {
  const inferred = DEFAULT_CONTRACT_TYPE_BY_NODE[input.nodeType] ?? "any";
  return {
    nodeId: input.nodeId,
    nodeType: input.nodeType,
    overview: { summary: input.description ?? `${input.title} definition` },
    input: { portType: inferred, fields: [] },
    output: { portType: inferred, fields: [] },
    updatedAt: Date.now()
  };
}

export function summarizeContract(contract: NodeContract): string {
  const required = contract.fields.filter((field) => field.required).length;
  const optional = contract.fields.length - required;
  return `${contract.portType} · ${required} required · ${optional} optional`;
}

export function computeCompatibilityHint(source: NodeDefinition, target: NodeDefinition): CompatibilityHint {
  const outputType = source.output.portType;
  const inputType = target.input.portType;
  if (outputType === "any" || inputType === "any" || outputType === inputType) {
    return { compatible: true, reason: `Source ${outputType} is compatible with target ${inputType}.` };
  }
  return { compatible: false, reason: `Source ${outputType} does not match target ${inputType}.` };
}

export function validateNodeDefinition(definition: NodeDefinition): string[] {
  const issues: string[] = [];
  const validateFields = (contract: NodeContract, side: "input" | "output") => {
    const keySet = new Set<string>();
    for (const field of contract.fields) {
      if (!field.key.trim()) issues.push(`${side}: field key is required`);
      if (keySet.has(field.key)) issues.push(`${side}: duplicate field key ${field.key}`);
      keySet.add(field.key);
      if (field.required && !field.description) issues.push(`${side}: required field ${field.key} should include a description`);
    }
  };
  validateFields(definition.input, "input");
  validateFields(definition.output, "output");
  if (definition.overview.owner && !definition.overview.reviewer) issues.push("overview: reviewer is recommended when owner is set");
  return issues;
}
