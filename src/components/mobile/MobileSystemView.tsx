"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphNode, GraphPipe } from "@/components/editor/editor_state";
import { MobileTopBar } from "./MobileTopBar";
import { MobileActionBar } from "./MobileActionBar";
import { MobileSystemCanvas } from "./MobileSystemCanvas";
import { MobileNodeSheet, type ConnectionRow } from "./MobileNodeSheet";
import { DesktopFirstBanner } from "./DesktopFirstBanner";

// MobileSystemView — the mobile experience for a single system. It is NOT a
// "your screen is too small" page. It is the same product, sized for thumbs:
// a real interactive (read-only) canvas at the top, a slide-up detail sheet
// for nodes, a sticky action bar at the bottom that copies the link and
// opens the share dialog.

type RawNode = {
  id: string;
  type?: string;
  title: string;
  description?: string;
  position?: { x: number; y: number };
  portIds?: string[];
  config?: Record<string, unknown>;
};
type RawPipe = {
  id?: string;
  fromPortId?: string;
  toPortId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  systemId?: string;
};
type RawSystem = { id?: string; name: string; description?: string };

type SystemData = {
  system: { id: string; name: string; description: string };
  nodes: GraphNode[];
  pipes: GraphPipe[];
};

function normalizeNode(node: RawNode, index: number): GraphNode {
  return {
    id: node.id,
    type: node.type ?? "step",
    title: node.title,
    description: node.description,
    position: node.position ?? { x: 64 + (index % 4) * 200, y: 64 + Math.floor(index / 4) * 120 },
    portIds: node.portIds ?? [`${node.id}_in`, `${node.id}_out`],
    config: node.config ?? {},
  };
}

function normalizePipe(pipe: RawPipe, index: number, systemId: string): GraphPipe {
  return {
    id: pipe.id ?? `pipe_${index}`,
    fromPortId: pipe.fromPortId ?? `${pipe.fromNodeId ?? ""}_out`,
    toPortId: pipe.toPortId ?? `${pipe.toNodeId ?? ""}_in`,
    systemId: pipe.systemId ?? systemId,
    fromNodeId: pipe.fromNodeId,
    toNodeId: pipe.toNodeId,
  };
}

export type MobileSystemViewProps = {
  systemId: string;
  workspaceName?: string;
  initialPrompt?: string;
};

export function MobileSystemView({ systemId, workspaceName, initialPrompt }: MobileSystemViewProps): React.ReactElement {
  const [data, setData] = useState<SystemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [building, setBuilding] = useState<boolean>(Boolean(initialPrompt));
  const [buildError, setBuildError] = useState(false);
  const focusFnRef = useRef<((nodeId: string) => void) | null>(null);
  const builtRef = useRef(false);

  const load = useCallback(async (): Promise<SystemData | null> => {
    const res = await fetch(`/api/systems/${systemId}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error("Could not load system.");
    const raw = body.data as { system: RawSystem; nodes: RawNode[]; pipes: RawPipe[] };
    const normalized: SystemData = {
      system: { id: raw.system.id ?? systemId, name: raw.system.name, description: raw.system.description ?? "" },
      nodes: raw.nodes.map(normalizeNode),
      pipes: raw.pipes.map((p, i) => normalizePipe(p, i, raw.system.id ?? systemId)),
    };
    return normalized;
  }, [systemId]);

  // Server-side build for the prompt the user arrived with. Surfaces failures
  // with a retry instead of leaving an empty canvas and no explanation.
  const runGenerate = useCallback(async () => {
    if (!initialPrompt) return;
    setBuildError(false);
    setBuilding(true);
    try {
      const res = await fetch(`/api/systems/${systemId}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: initialPrompt }),
      });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !body.ok) throw new Error(body.error ?? "build_failed");
      const rebuilt = await load();
      if (rebuilt) setData(rebuilt);
    } catch {
      setBuildError(true);
    } finally {
      setBuilding(false);
    }
  }, [initialPrompt, systemId, load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await load();
        if (cancelled || !loaded) return;
        setData(loaded);

        // Mobile magic moment: if we arrived with a prompt and the canvas is
        // empty, build it server-side (read-only mobile can't apply locally),
        // then reload to show the finished loop.
        if (initialPrompt && !builtRef.current && loaded.nodes.length === 0) {
          builtRef.current = true;
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.has("prompt")) {
              url.searchParams.delete("prompt");
              window.history.replaceState({}, "", url.toString());
            }
          }
          if (!cancelled) await runGenerate();
        } else {
          setBuilding(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load system.");
          setBuilding(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId, initialPrompt, load, runGenerate]);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: data?.system.name ?? "Looper", url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // best-effort
    }
  }, [data]);

  const portToNode = useMemo(() => {
    if (!data) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const node of data.nodes) {
      for (const portId of node.portIds ?? []) m.set(portId, node.id);
    }
    return m;
  }, [data]);

  const selectedNode = useMemo<GraphNode | null>(() => {
    if (!data || !selectedNodeId) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [data, selectedNodeId]);

  const { outbound, inbound } = useMemo<{ outbound: ConnectionRow[]; inbound: ConnectionRow[] }>(() => {
    if (!data || !selectedNodeId) return { outbound: [], inbound: [] };
    const titleById = new Map(data.nodes.map((n) => [n.id, n.title] as const));
    const out: ConnectionRow[] = [];
    const inc: ConnectionRow[] = [];
    for (const pipe of data.pipes) {
      const fromId = pipe.fromNodeId ?? portToNode.get(pipe.fromPortId);
      const toId = pipe.toNodeId ?? portToNode.get(pipe.toPortId);
      if (!fromId || !toId) continue;
      if (fromId === selectedNodeId) {
        const title = titleById.get(toId);
        if (title) out.push({ nodeId: toId, title });
      } else if (toId === selectedNodeId) {
        const title = titleById.get(fromId);
        if (title) inc.push({ nodeId: fromId, title });
      }
    }
    return { outbound: out, inbound: inc };
  }, [data, selectedNodeId, portToNode]);

  const handleNodeTap = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleConnectionTap = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (focusFnRef.current) focusFnRef.current(nodeId);
  }, []);

  const registerFocus = useCallback((focus: (nodeId: string) => void) => {
    focusFnRef.current = focus;
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileTopBar workspaceName={workspaceName} systemName="Looper" onShare={handleShare} />
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="t-label text-[#8E8E93]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col">
        <MobileTopBar workspaceName={workspaceName} systemName="Loading" onShare={handleShare} />
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="t-label text-[#8E8E93]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileTopBar
        workspaceName={workspaceName}
        systemName={data.system.name || "Untitled system"}
        onShare={handleShare}
      />
      <div className="px-3 pt-3">
        <DesktopFirstBanner />
      </div>
      <div
        className="flex-1 relative"
        style={{ minHeight: "60vh" }}
      >
        <MobileSystemCanvas
          nodes={data.nodes}
          pipes={data.pipes}
          selectedNodeId={selectedNodeId}
          onNodeTap={handleNodeTap}
          onEmptyTap={() => setSelectedNodeId(null)}
          registerFocus={registerFocus}
        />
        {building ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 t-label text-[#3C3C43] bg-white/90 px-4 py-2 rounded-full border border-black/[0.06] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Building your loop...
            </div>
          </div>
        ) : buildError ? (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-3 text-center bg-white/95 px-5 py-4 rounded-2xl border border-black/[0.06] shadow-sm max-w-[280px]">
              <p className="t-label text-[#3C3C43]">Could not build your loop.</p>
              <button
                type="button"
                onClick={() => void runGenerate()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#111] px-4 py-2 t-label font-semibold text-white"
              >
                Try again
              </button>
            </div>
          </div>
        ) : data.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="t-label text-[#8E8E93] bg-white/80 px-3 py-1.5 rounded-full border border-black/[0.06] text-center max-w-[260px]">
              Empty loop. Describe one from the dashboard, or open on desktop to edit by hand.
            </p>
          </div>
        ) : null}
      </div>
      <MobileActionBar shareUrl={typeof window !== "undefined" ? window.location.href : undefined} shareTitle={data.system.name} />
      <MobileNodeSheet
        open={selectedNodeId !== null}
        node={selectedNode}
        outbound={outbound}
        inbound={inbound}
        onClose={() => setSelectedNodeId(null)}
        onConnectionTap={handleConnectionTap}
      />
    </div>
  );
}
