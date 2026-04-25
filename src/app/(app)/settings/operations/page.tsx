"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Chip,
  Table,
} from "@heroui/react";
import { SkeletonCard } from "@/components/ui";

type ChipColor = "success" | "warning" | "danger" | "default" | "accent";

function statusColor(status: string): ChipColor {
  switch (status) {
    case "active":
      return "success";
    case "candidate":
      return "warning";
    case "deprecated":
      return "danger";
    default:
      return "default";
  }
}

export default function OperationsSettingsPage() {
  const [presets, setPresets] = useState<any[]>([]);
  const [versions, setVersions] = useState<{ promptVersions: any[]; strategyVersions: any[] }>({
    promptVersions: [],
    strategyVersions: [],
  });
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agent/presets").then((r) => r.json()).then((d) => setPresets(d.data ?? [])),
      fetch("/api/agent/versions")
        .then((r) => r.json())
        .then((d) => setVersions(d.data ?? { promptVersions: [], strategyVersions: [] })),
      fetch("/api/agent/skills").then((r) => r.json()).then((d) => setSkills(d.data ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  const allVersions = [
    ...versions.promptVersions.map((p) => ({ name: p.name ?? p.id, type: "prompt", version: p.version ?? p.id, status: p.status })),
    ...versions.strategyVersions.map((s) => ({ name: s.name ?? s.id, type: "strategy", version: s.version ?? s.id, status: s.status })),
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operations</h1>
        <p className="text-sm text-default-500 mt-1">
          Agent builder configuration and version management
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Builder Presets */}
          <Card>
            <Card.Header className="pb-0">
              <div>
                <h2 className="text-base font-semibold text-foreground">Builder Presets</h2>
                <p className="text-xs text-default-400 mt-0.5">
                  Active preset configuration for this workspace
                </p>
              </div>
            </Card.Header>
            <Card.Content>
              {presets.length === 0 ? (
                <p className="text-sm text-default-400 py-4 text-center">No presets found.</p>
              ) : (
                <Table aria-label="Builder presets">
                  <Table.Content>
                    <Table.Header>
                      <Table.Row>
                        <Table.Column>Name</Table.Column>
                        <Table.Column>Batching Posture</Table.Column>
                        <Table.Column>Review Hint</Table.Column>
                        <Table.Column>Status</Table.Column>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {presets.map((p, i) => (
                        <Table.Row key={p.id ?? i}>
                          <Table.Cell className="font-medium">{p.name ?? "—"}</Table.Cell>
                          <Table.Cell>{p.batchingPosture ?? "—"}</Table.Cell>
                          <Table.Cell>{p.reviewHint ?? "—"}</Table.Cell>
                          <Table.Cell>
                            {p.active ? (
                              <Chip color="success" size="sm" variant="soft">
                                Active
                              </Chip>
                            ) : (
                              <Chip color="default" size="sm" variant="soft">
                                Inactive
                              </Chip>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table>
              )}
            </Card.Content>
          </Card>

          {/* Prompt / Strategy Versions */}
          <Card>
            <Card.Header className="pb-0">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Prompt &amp; Strategy Versions
                </h2>
                <p className="text-xs text-default-400 mt-0.5">
                  Deployed prompt and strategy artifacts
                </p>
              </div>
            </Card.Header>
            <Card.Content>
              {allVersions.length === 0 ? (
                <p className="text-sm text-default-400 py-4 text-center">No versions found.</p>
              ) : (
                <Table aria-label="Prompt and strategy versions">
                  <Table.Content>
                    <Table.Header>
                      <Table.Row>
                        <Table.Column>Name</Table.Column>
                        <Table.Column>Type</Table.Column>
                        <Table.Column>Version</Table.Column>
                        <Table.Column>Status</Table.Column>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {allVersions.map((v, i) => (
                        <Table.Row key={i}>
                          <Table.Cell className="font-medium">{v.name ?? "—"}</Table.Cell>
                          <Table.Cell>
                            <span className="capitalize text-default-600">{v.type}</span>
                          </Table.Cell>
                          <Table.Cell className="font-mono text-xs">{v.version ?? "—"}</Table.Cell>
                          <Table.Cell>
                            <Chip
                              color={statusColor(v.status)}
                              size="sm"
                              variant="soft"
                            >
                              {v.status ?? "unknown"}
                            </Chip>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table>
              )}
            </Card.Content>
          </Card>

          {/* Skill Bindings */}
          <Card>
            <Card.Header className="pb-0">
              <div>
                <h2 className="text-base font-semibold text-foreground">Skill Bindings</h2>
                <p className="text-xs text-default-400 mt-0.5">
                  Skill version bindings for this workspace
                </p>
              </div>
            </Card.Header>
            <Card.Content>
              {skills.length === 0 ? (
                <p className="text-sm text-default-400 py-4 text-center">No skill bindings found.</p>
              ) : (
                <Table aria-label="Skill version bindings">
                  <Table.Content>
                    <Table.Header>
                      <Table.Row>
                        <Table.Column>Skill</Table.Column>
                        <Table.Column>Version</Table.Column>
                        <Table.Column>Binding Status</Table.Column>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {skills.map((s, i) => (
                        <Table.Row key={s.skillId ?? i}>
                          <Table.Cell className="font-medium">{s.skillId ?? "—"}</Table.Cell>
                          <Table.Cell className="font-mono text-xs">{String(s.version ?? "—")}</Table.Cell>
                          <Table.Cell>
                            <Chip
                              color={statusColor(s.status)}
                              size="sm"
                              variant="soft"
                            >
                              {s.status ?? "unknown"}
                            </Chip>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table>
              )}
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
}
