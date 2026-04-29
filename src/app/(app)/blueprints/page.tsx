"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, Button, Chip, Spinner } from "@heroui/react";
import { Layers, Copy, Download, Plus } from "lucide-react";
import type { SubsystemBlueprint } from "@/domain/subsystem_blueprint/types";

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

type System = { id: string; name: string };

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<SubsystemBlueprint[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [inserting, setInserting] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const [bpRes, sysRes] = await Promise.all([
        fetch("/api/blueprints"),
        fetch("/api/library"),
      ]);
      const bpData = await bpRes.json();
      const sysData = await sysRes.json();
      setBlueprints(bpData.data ?? []);
      setSystems((sysData.data ?? []).map((s: any) => ({ id: s.id, name: s.name })));
    } catch {
      toast.error("Failed to load blueprints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" />
          Subsystem Blueprints
        </h1>
        <p className="mt-1 text-sm text-default-500">
          Reusable subsystem snapshots you can insert into any system. Export a subsystem node from the editor to create one.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : blueprints.length === 0 ? (
        <Card className="shadow-sm border border-divider">
          <Card.Content className="p-12 flex flex-col items-center text-center gap-3">
            <Layers className="w-12 h-12 text-default-300" />
            <p className="text-sm font-medium text-default-500">No blueprints yet</p>
            <p className="text-xs text-default-400 max-w-sm">
              Open a system in the editor, right-click a Subsystem node, and choose &quot;Export as Blueprint&quot; to save it here.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blueprints.map((bp) => (
            <Card key={bp.id} className="shadow-sm border border-divider">
              <Card.Content className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{bp.name}</h3>
                    {bp.description && (
                      <p className="text-xs text-default-500 mt-0.5 line-clamp-2">{bp.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(bp.tags ?? []).map((tag) => (
                      <Chip key={tag} size="sm" variant="soft" color="accent" className="text-[10px]">{tag}</Chip>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-default-400">
                  <span className="flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    {bp.nodeCount} nodes
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {bp.pipeCount} pipes
                  </span>
                  <span>{formatDate(bp.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={selectedSystem[bp.id] ?? ""}
                    onChange={(e) => setSelectedSystem((prev) => ({ ...prev, [bp.id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-default-200 bg-white dark:bg-default-100 px-2 py-1.5 text-xs text-default-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select target system…</option>
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={() => handleInstantiate(bp.id)}
                    isDisabled={!selectedSystem[bp.id] || inserting === bp.id}
                  >
                    {inserting === bp.id ? <Spinner size="sm" /> : <Plus className="w-3.5 h-3.5" />}
                    Insert
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
