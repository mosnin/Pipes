"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  CardShell,
  EmptyState,
  HelpText,
  Input,
  InlineCode,
  KbdHint,
  Select,
  Textarea,
  Tooltip,
  ValidationBadge,
} from "@/components/ui";
import { Mouse, Plus, Trash2 } from "lucide-react";
import {
  computeCompatibilityHint,
  createDefaultNodeDefinition,
  summarizeContract,
  type ContractType,
  type FieldContract,
  type NodeDefinition,
  validateNodeDefinition,
} from "@/components/editor/node_definition";
import type { EditorGraphAction, GraphNode, GraphPipe } from "@/components/editor/editor_state";
import { type PipeRouteKind, type PipeSemantics } from "@/components/editor/pipe_semantics";
import { getConfigSchema } from "@/domain/node_config/schema";
import type { NodeType } from "@/domain/pipes_schema_v1/schema";

export type InspectorTab = "config" | "advanced";

const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
  { id: "config", label: "Config" },
  { id: "advanced", label: "Advanced" },
];

const CONTRACT_TYPES: ContractType[] = ["string", "number", "boolean", "json", "event", "file", "any"];

export type CompatibilityRow = {
  direction: "inbound" | "outbound";
  nodeTitle: string;
  hint: ReturnType<typeof computeCompatibilityHint>;
};

export type EditorInspectorProps = {
  selectedNode?: GraphNode;
  selectedEdge?: GraphPipe;
  selectedDefinition?: NodeDefinition;
  nodeDefinitions: Record<string, NodeDefinition>;
  occupancyNames: string[];
  pipeSemantics: Record<string, PipeSemantics>;
  systemId: string;
  compatibilityHints: CompatibilityRow[];
  onRecordAction: (forward: EditorGraphAction, inverse: EditorGraphAction, coalesceKey?: string) => void;
  onUpdateNodeDefinition: (nodeId: string, mutate: (current: NodeDefinition) => NodeDefinition) => void;
  onUpdateDefinitionField: (
    contract: "input" | "output",
    fieldId: string,
    patch: Partial<FieldContract>,
  ) => void;
  onAddDefinitionField: (contract: "input" | "output") => void;
  onRemoveDefinitionField: (contract: "input" | "output", fieldId: string) => void;
  onUpdateNodeConfig: (nodeId: string, key: string, value: unknown) => void;
  onUpdatePipeSemantics: (
    pipeId: string,
    patch: Partial<PipeSemantics> & { pipeId: string; routeKind: PipeRouteKind },
  ) => void;
  onDeleteSelectedNode: () => void;
  onAddDownstream: () => void;
  onAddUpstream: () => void;
};

export function EditorInspector({
  selectedNode,
  selectedEdge,
  selectedDefinition,
  occupancyNames,
  pipeSemantics,
  compatibilityHints,
  onRecordAction,
  onUpdateNodeDefinition,
  onUpdateDefinitionField,
  onAddDefinitionField,
  onRemoveDefinitionField,
  onUpdateNodeConfig,
  onUpdatePipeSemantics,
  onDeleteSelectedNode,
  onAddDownstream,
  onAddUpstream,
}: EditorInspectorProps) {
  const [tab, setTab] = useState<InspectorTab>("config");
  const definitionIssues = selectedDefinition ? validateNodeDefinition(selectedDefinition) : [];

  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="w-[320px] shrink-0 border-l border-black/[0.08] bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-black/[0.06]">
          <h3 className="t-label font-semibold text-[#111]">Inspector</h3>
        </div>
        <div className="flex-1 p-4">
          <EmptyState
            title="Nothing selected"
            description="Click a node or pipe on the canvas to inspect it."
            action={
              <span className="inline-flex items-center gap-1 t-caption text-[#8E8E93]">
                <Mouse size={12} /> Tap any node to begin
              </span>
            }
          />
        </div>
      </aside>
    );
  }

  if (selectedEdge && !selectedNode) {
    const semantics = pipeSemantics[selectedEdge.id];
    return (
      <aside className="w-[320px] shrink-0 border-l border-black/[0.08] bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="t-label font-semibold text-[#111]">Pipe</h3>
          <Badge tone="neutral">{semantics?.routeKind ?? "default"}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
          <div>
            <label className="t-caption font-medium text-[#3C3C43] block mb-1">Label</label>
            <Input
              value={semantics?.label ?? ""}
              onChange={(e) =>
                onUpdatePipeSemantics(selectedEdge.id, {
                  pipeId: selectedEdge.id,
                  routeKind: semantics?.routeKind ?? "default",
                  label: e.target.value,
                })
              }
              placeholder="Pipe label"
            />
          </div>
          <div>
            <label className="t-caption font-medium text-[#3C3C43] block mb-1">Condition</label>
            <Input
              value={semantics?.conditionLabel ?? ""}
              onChange={(e) =>
                onUpdatePipeSemantics(selectedEdge.id, {
                  pipeId: selectedEdge.id,
                  routeKind: semantics?.routeKind ?? "default",
                  conditionLabel: e.target.value,
                })
              }
              placeholder="e.g. score > 0.8"
            />
          </div>
          <div>
            <label className="t-caption font-medium text-[#3C3C43] block mb-1">Route kind</label>
            <Select
              value={semantics?.routeKind ?? "default"}
              onChange={(e) =>
                onUpdatePipeSemantics(selectedEdge.id, {
                  pipeId: selectedEdge.id,
                  routeKind: e.target.value as PipeRouteKind,
                })
              }
            >
              <option value="default">default</option>
              <option value="success">success</option>
              <option value="failure">failure</option>
              <option value="conditional">conditional</option>
              <option value="loop">loop</option>
            </Select>
          </div>
          <div>
            <label className="t-caption font-medium text-[#3C3C43] block mb-1">Notes</label>
            <Textarea
              value={semantics?.notes ?? ""}
              onChange={(e) =>
                onUpdatePipeSemantics(selectedEdge.id, {
                  pipeId: selectedEdge.id,
                  routeKind: semantics?.routeKind ?? "default",
                  notes: e.target.value,
                })
              }
              placeholder="Route rationale"
              rows={3}
            />
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedNode) return null;
  const safeDefinition =
    selectedDefinition ??
    createDefaultNodeDefinition({
      nodeId: selectedNode.id,
      nodeType: selectedNode.type,
      title: selectedNode.title,
      description: selectedNode.description,
    });

  return (
    <aside className="w-[320px] shrink-0 border-l border-black/[0.08] bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-black/[0.06]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="t-label font-semibold text-[#111] truncate">{selectedNode.title}</h3>
            <p className="t-caption text-[#8E8E93]">{selectedNode.type}</p>
          </div>
          <Badge tone="neutral">{selectedNode.type}</Badge>
        </div>
        {occupancyNames.length > 1 && (
          <HelpText tone="error" className="mt-2">
            Editing with {occupancyNames.join(", ")}
          </HelpText>
        )}
        <div className="flex items-center gap-1 mt-3 -mb-1 flex-wrap">
          {INSPECTOR_TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`px-2 py-1 t-caption rounded-md font-medium transition-colors ${
                tab === tabItem.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-[#8E8E93] hover:text-[#3C3C43] hover:bg-black/[0.04]"
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
        {tab === "config" && (
          <div className="space-y-4">
            {(() => {
              const fields = getConfigSchema(selectedNode.type as NodeType);
              if (fields.length === 0) {
                return (
                  <HelpText>No typed config schema for this node type.</HelpText>
                );
              }
              return (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <Field
                      key={field.key}
                      label={field.label}
                      required={field.required}
                      hint={field.description}
                    >
                      {field.type === "select" ? (
                        <Select
                          value={String(
                            (selectedNode.config?.[field.key] ?? field.defaultValue) ?? "",
                          )}
                          onChange={(e) => onUpdateNodeConfig(selectedNode.id, field.key, e.target.value)}
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      ) : field.type === "boolean" ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedNode.config?.[field.key] ?? field.defaultValue)}
                            onChange={(e) =>
                              onUpdateNodeConfig(selectedNode.id, field.key, e.target.checked)
                            }
                            className="rounded border-black/[0.12]"
                          />
                          <span className="t-caption text-[#3C3C43]">{field.label}</span>
                        </label>
                      ) : field.type === "textarea" ? (
                        <Textarea
                          value={String(selectedNode.config?.[field.key] ?? "")}
                          onChange={(e) => onUpdateNodeConfig(selectedNode.id, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                        />
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                          value={String(selectedNode.config?.[field.key] ?? "")}
                          onChange={(e) =>
                            onUpdateNodeConfig(
                              selectedNode.id,
                              field.key,
                              field.type === "number" ? Number(e.target.value) : e.target.value,
                            )
                          }
                          placeholder={field.placeholder}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              );
            })()}
            <Field label="Title">
              <Input
                defaultValue={selectedNode.title}
                onBlur={(e) =>
                  onRecordAction(
                    { action: "updateNode", nodeId: selectedNode.id, title: e.target.value },
                    { action: "updateNode", nodeId: selectedNode.id, title: selectedNode.title },
                  )
                }
              />
            </Field>
            <Field label="Description">
              <Input
                defaultValue={selectedNode.description ?? ""}
                onBlur={(e) =>
                  onRecordAction(
                    { action: "updateNode", nodeId: selectedNode.id, description: e.target.value },
                    {
                      action: "updateNode",
                      nodeId: selectedNode.id,
                      description: selectedNode.description ?? "",
                    },
                  )
                }
              />
            </Field>
            <CardShell padded className="bg-[var(--surface-subtle,#FAFAFA)]">
              <p className="t-overline text-[#8E8E93] mb-2">Config notes</p>
              <Textarea
                value={safeDefinition.configNotes ?? ""}
                onChange={(e) =>
                  onUpdateNodeDefinition(selectedNode.id, (current) => ({
                    ...current,
                    configNotes: e.target.value,
                  }))
                }
                placeholder="Configuration notes"
                rows={3}
              />
            </CardShell>
          </div>
        )}

        {tab === "advanced" && (
          <div className="space-y-5">
            {/* Identity */}
            <section className="space-y-3">
              <p className="t-overline text-[#8E8E93]">Identity</p>
              <Field label="Summary">
                <Input
                  value={safeDefinition.overview.summary ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, summary: e.target.value },
                    }))
                  }
                  placeholder="Short summary"
                />
              </Field>
              <Field label="Purpose">
                <Input
                  value={safeDefinition.overview.purpose ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, purpose: e.target.value },
                    }))
                  }
                  placeholder="Why this exists"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Owner">
                  <Input
                    value={safeDefinition.overview.owner ?? ""}
                    onChange={(e) =>
                      onUpdateNodeDefinition(selectedNode.id, (current) => ({
                        ...current,
                        overview: { ...current.overview, owner: e.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Reviewer">
                  <Input
                    value={safeDefinition.overview.reviewer ?? ""}
                    onChange={(e) =>
                      onUpdateNodeDefinition(selectedNode.id, (current) => ({
                        ...current,
                        overview: { ...current.overview, reviewer: e.target.value },
                      }))
                    }
                  />
                </Field>
              </div>
            </section>

            <div className="border-t border-black/[0.06]" />

            {/* Ports — Inputs */}
            <section className="space-y-3">
              <p className="t-overline text-[#8E8E93]">Ports — Inputs</p>
              <HelpText>Schema: {summarizeContract(safeDefinition.input)}</HelpText>
              <Field label="Port type">
                <Select
                  value={safeDefinition.input.portType}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      input: { ...current.input, portType: e.target.value as ContractType },
                    }))
                  }
                >
                  {CONTRACT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Summary">
                <Textarea
                  value={safeDefinition.input.summary ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      input: { ...current.input, summary: e.target.value },
                    }))
                  }
                  placeholder="Input contract summary"
                  rows={2}
                />
              </Field>
              <Field label="Sample payload">
                <Textarea
                  value={safeDefinition.input.samplePayload ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      input: { ...current.input, samplePayload: e.target.value },
                    }))
                  }
                  placeholder="Sample payload / shape"
                  rows={3}
                />
              </Field>
              <div className="flex items-center justify-between">
                <p className="t-overline text-[#8E8E93]">Fields ({safeDefinition.input.fields.length})</p>
                <Button variant="outline" size="sm" onPress={() => onAddDefinitionField("input")}>
                  <Plus size={12} /> Field
                </Button>
              </div>
              {safeDefinition.input.fields.map((field) => (
                <CardShell key={field.id} padded className="bg-[var(--surface-subtle,#FAFAFA)]">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <Input
                      value={field.key}
                      onChange={(e) => onUpdateDefinitionField("input", field.id, { key: e.target.value })}
                      placeholder="Field key"
                    />
                    <Tooltip content="Remove field">
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => onRemoveDefinitionField("input", field.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Select
                      value={field.type}
                      onChange={(e) =>
                        onUpdateDefinitionField("input", field.id, { type: e.target.value as ContractType })
                      }
                    >
                      {CONTRACT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                    <label className="inline-flex items-center gap-2 t-caption text-[#3C3C43]">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          onUpdateDefinitionField("input", field.id, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                  </div>
                  <Textarea
                    value={field.transformNotes ?? ""}
                    onChange={(e) =>
                      onUpdateDefinitionField("input", field.id, { transformNotes: e.target.value })
                    }
                    placeholder="Transformation notes"
                    rows={2}
                  />
                </CardShell>
              ))}
            </section>

            <div className="border-t border-black/[0.06]" />

            {/* Ports — Outputs */}
            <section className="space-y-3">
              <p className="t-overline text-[#8E8E93]">Ports — Outputs</p>
              <HelpText>Schema: {summarizeContract(safeDefinition.output)}</HelpText>
              <Field label="Port type">
                <Select
                  value={safeDefinition.output.portType}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      output: { ...current.output, portType: e.target.value as ContractType },
                    }))
                  }
                >
                  {CONTRACT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Summary">
                <Textarea
                  value={safeDefinition.output.summary ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      output: { ...current.output, summary: e.target.value },
                    }))
                  }
                  placeholder="Output contract summary"
                  rows={2}
                />
              </Field>
              <Field label="Sample payload">
                <Textarea
                  value={safeDefinition.output.samplePayload ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      output: { ...current.output, samplePayload: e.target.value },
                    }))
                  }
                  placeholder="Sample output payload"
                  rows={3}
                />
              </Field>
              <div className="flex items-center justify-between">
                <p className="t-overline text-[#8E8E93]">Fields ({safeDefinition.output.fields.length})</p>
                <Button variant="outline" size="sm" onPress={() => onAddDefinitionField("output")}>
                  <Plus size={12} /> Field
                </Button>
              </div>
              {safeDefinition.output.fields.map((field) => (
                <CardShell key={field.id} padded className="bg-[var(--surface-subtle,#FAFAFA)]">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <Input
                      value={field.key}
                      onChange={(e) => onUpdateDefinitionField("output", field.id, { key: e.target.value })}
                      placeholder="Field key"
                    />
                    <Tooltip content="Remove field">
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => onRemoveDefinitionField("output", field.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Select
                      value={field.type}
                      onChange={(e) =>
                        onUpdateDefinitionField("output", field.id, { type: e.target.value as ContractType })
                      }
                    >
                      {CONTRACT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                    <label className="inline-flex items-center gap-2 t-caption text-[#3C3C43]">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          onUpdateDefinitionField("output", field.id, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                  </div>
                  <Input
                    value={field.example ?? ""}
                    onChange={(e) =>
                      onUpdateDefinitionField("output", field.id, { example: e.target.value })
                    }
                    placeholder="Example"
                  />
                  <Textarea
                    className="mt-2"
                    value={field.description ?? ""}
                    onChange={(e) =>
                      onUpdateDefinitionField("output", field.id, { description: e.target.value })
                    }
                    placeholder="Description"
                    rows={2}
                  />
                </CardShell>
              ))}
            </section>

            <div className="border-t border-black/[0.06]" />

            {/* Notes */}
            <section className="space-y-3">
              <p className="t-overline text-[#8E8E93]">Notes</p>
              <Field label="Assumptions">
                <Textarea
                  value={safeDefinition.overview.assumptions ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, assumptions: e.target.value },
                    }))
                  }
                  rows={3}
                />
              </Field>
              <Field label="Failure modes">
                <Textarea
                  value={safeDefinition.overview.failureNotes ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, failureNotes: e.target.value },
                    }))
                  }
                  rows={3}
                />
              </Field>
              <Field label="Implementation notes">
                <Textarea
                  value={safeDefinition.overview.implementationNotes ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, implementationNotes: e.target.value },
                    }))
                  }
                  rows={3}
                />
              </Field>
              <Field label="General notes">
                <Textarea
                  value={safeDefinition.notes ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      notes: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </Field>
            </section>

            <div className="border-t border-black/[0.06]" />

            {/* Validation */}
            <section className="space-y-2">
              <p className="t-overline text-[#8E8E93]">Validation</p>
              <p className="t-caption text-[#8E8E93]">Definition checks</p>
              {definitionIssues.length === 0 ? (
                <Badge tone="good">No definition issues</Badge>
              ) : (
                definitionIssues.map((issue) => (
                  <CardShell key={issue} padded>
                    <div className="flex items-start gap-2">
                      <ValidationBadge severity="warning" />
                      <p className="t-caption text-[#3C3C43]">{issue}</p>
                    </div>
                  </CardShell>
                ))
              )}
              <p className="t-caption text-[#8E8E93] mt-3">Compatibility hints</p>
              {compatibilityHints.length === 0 ? (
                <HelpText>No connected nodes to compare.</HelpText>
              ) : (
                compatibilityHints.map((hint, index) => (
                  <CardShell key={`${hint.nodeTitle}_${index}`} padded>
                    <div className="flex items-start gap-2">
                      <ValidationBadge severity={hint.hint.compatible ? "info" : "warning"} />
                      <p className="t-caption text-[#3C3C43]">
                        {hint.direction} . {hint.nodeTitle}: {hint.hint.reason}
                      </p>
                    </div>
                  </CardShell>
                ))
              )}
            </section>

            <div className="border-t border-black/[0.06]" />

            {/* Docs */}
            <section className="space-y-3">
              <p className="t-overline text-[#8E8E93]">Docs</p>
              <Field label="Linked asset">
                <Input
                  value={safeDefinition.overview.linkedAsset ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, linkedAsset: e.target.value },
                    }))
                  }
                  placeholder="Asset id or URL"
                />
              </Field>
              <Field label="Linked snippet">
                <Input
                  value={safeDefinition.overview.linkedSnippet ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, linkedSnippet: e.target.value },
                    }))
                  }
                  placeholder="Snippet id or URL"
                />
              </Field>
              <Field label="Documentation link">
                <Input
                  value={safeDefinition.overview.docsRef ?? ""}
                  onChange={(e) =>
                    onUpdateNodeDefinition(selectedNode.id, (current) => ({
                      ...current,
                      overview: { ...current.overview, docsRef: e.target.value },
                    }))
                  }
                  placeholder="https://"
                />
              </Field>
              <HelpText>
                Reference: <InlineCode>pipes_schema_v1</InlineCode>
              </HelpText>
            </section>
          </div>
        )}
      </div>

      <div className="border-t border-black/[0.06] px-3 py-2 flex items-center gap-1 flex-wrap">
        <Tooltip content={<span className="inline-flex items-center gap-1">Add downstream <KbdHint keys={["Shift", "O"]} /></span>}>
          <Button variant="ghost" size="sm" onPress={onAddDownstream}>
            <Plus size={12} /> Down
          </Button>
        </Tooltip>
        <Tooltip content={<span className="inline-flex items-center gap-1">Add upstream <KbdHint keys={["Shift", "I"]} /></span>}>
          <Button variant="ghost" size="sm" onPress={onAddUpstream}>
            <Plus size={12} /> Up
          </Button>
        </Tooltip>
        <span className="flex-1" />
        <Tooltip content="Delete node">
          <Button variant="danger-soft" size="sm" onPress={onDeleteSelectedNode}>
            <Trash2 size={12} /> Delete
          </Button>
        </Tooltip>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="t-caption font-medium text-[#3C3C43] block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <HelpText>{hint}</HelpText>}
    </div>
  );
}
