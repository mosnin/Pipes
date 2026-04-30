"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Layers, Plus, ArrowRight, Network, GitMerge } from "lucide-react";
import {
  Button,
  Spinner,
  Badge,
  Breadcrumbs,
  PageHeader,
  CardShell,
  CardHeader,
  CardBody,
  CardFooter,
  Toolbar,
  SegmentedControl,
  EmptyState,
  StatusBadge,
  Select,
  HelpText,
} from "@/components/ui";
import type { SubsystemBlueprint } from "@/domain/subsystem_blueprint/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type System = { id: string; name: string };

type LibraryRowLite = {
  id: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

const ALL_TAG = "__all__";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<SubsystemBlueprint[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [inserting, setInserting] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<Record<string, string>>({});
  const [tagFilter, setTagFilter] = useState<string>(ALL_TAG);

  const load = async () => {
    setLoading(true);
    try {
      const [bpRes, sysRes] = await Promise.all([
        fetch("/api/blueprints"),
        fetch("/api/library"),
      ]);
      const bpData = await bpRes.json();
      const sysData = await sysRes.json();
      setBlueprints((bpData.data as SubsystemBlueprint[]) ?? []);
      const rawRows: LibraryRowLite[] = sysData.data?.rows ?? [];
      setSystems(rawRows.map((s) => ({ id: s.id, name: s.name })));
    } catch {
      toast.error("Failed to load blueprints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleInstantiate = async (blueprintId: string) => {
    const targetSystemId = selectedSystem[blueprintId];
    if (!targetSystemId) {
      toast.error("Select a target system first");
      return;
    }
    setInserting(blueprintId);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/instantiate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetSystemId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Inserted ${data.data.nodeCount} nodes into system`);
      } else {
        toast.error(data.error ?? "Failed to instantiate blueprint");
      }
    } catch {
      toast.error("Failed to instantiate blueprint");
    } finally {
      setInserting(null);
    }
  };

  // Tag filter list
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const bp of blueprints) {
      for (const tag of bp.tags ?? []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [blueprints]);

  const filteredBlueprints = useMemo(() => {
    if (tagFilter === ALL_TAG) return blueprints;
    return blueprints.filter((bp) => (bp.tags ?? []).includes(tagFilter));
  }, [blueprints, tagFilter]);

  return (
    <div className="surface-subtle min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: "Workspace" }, { label: "Blueprints" }]} />
        <div className="mt-3">
          <PageHeader
            title="Subsystem Blueprints"
            subtitle="Reusable subsystem snapshots. Insert into any system in seconds."
            actions={
              <Button variant="outline" size="sm">
                <Plus size={14} />
                Save current as blueprint
              </Button>
            }
          />
        </div>

        {/* Toolbar */}
        <CardShell className="mb-4">
          <Toolbar
            left={
              <SegmentedControl
                size="sm"
                value={tagFilter}
                onChange={setTagFilter}
                items={[
                  { id: ALL_TAG, label: `All (${blueprints.length})` },
                  ...allTags.map((t) => ({ id: t, label: t })),
                ]}
              />
            }
            right={
              <span className="t-caption text-[#8E8E93]">
                {filteredBlueprints.length} blueprint
                {filteredBlueprints.length === 1 ? "" : "s"}
              </span>
            }
          />
        </CardShell>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : filteredBlueprints.length === 0 ? (
          <EmptyState
            title={blueprints.length === 0 ? "No blueprints yet" : "No matches"}
            description={
              blueprints.length === 0
                ? "Open a system, right-click a Subsystem node, and choose Export as Blueprint to save it here."
                : "No blueprints match the selected tag. Try All to see everything."
            }
            action={
              blueprints.length === 0 ? (
                <Button variant="outline" size="sm">
                  <Layers size={14} />
                  Learn more
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setTagFilter(ALL_TAG)}
                >
                  Show all
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBlueprints.map((bp) => (
              <CardShell key={bp.id} className="hover-lift transition-colors hover:border-indigo-300">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="t-label font-semibold text-[#111] truncate">
                        {bp.name}
                      </h3>
                      <p className="t-caption text-[#8E8E93] mt-1 line-clamp-2 leading-snug">
                        {bp.description || "No description"}
                      </p>
                    </div>
                    <StatusBadge tone="info">v1</StatusBadge>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center gap-3 t-caption text-[#8E8E93]">
                    <span className="inline-flex items-center gap-1">
                      <Network size={12} />
                      {bp.nodeCount} node{bp.nodeCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GitMerge size={12} />
                      {bp.pipeCount} pipe{bp.pipeCount === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto">{formatDate(bp.createdAt)}</span>
                  </div>
                  {(bp.tags ?? []).length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-3">
                      {(bp.tags ?? []).map((tag) => (
                        <Badge key={tag} tone="neutral">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardBody>
                <CardFooter>
                  <Select
                    aria-label="Target system"
                    value={selectedSystem[bp.id] ?? ""}
                    onChange={(e) =>
                      setSelectedSystem((prev) => ({
                        ...prev,
                        [bp.id]: e.target.value,
                      }))
                    }
                    className="h-9"
                  >
                    <option value="">Select target system...</option>
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => handleInstantiate(bp.id)}
                    isDisabled={!selectedSystem[bp.id] || inserting === bp.id}
                  >
                    {inserting === bp.id ? (
                      <Spinner size="xs" />
                    ) : (
                      <>
                        Use
                        <ArrowRight size={14} />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </CardShell>
            ))}
          </div>
        )}

        {!loading && systems.length === 0 && filteredBlueprints.length > 0 && (
          <div className="mt-4">
            <HelpText>
              No systems available -- create one from the dashboard before inserting a blueprint.
            </HelpText>
          </div>
        )}
      </div>
    </div>
  );
}
