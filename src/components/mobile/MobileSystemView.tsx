"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Monitor } from "lucide-react";
import { DesktopFirstBanner } from "./DesktopFirstBanner";

// MobileSystemView: read-only artifact view of a system on a phone or small
// tablet. No canvas, no drag, no agent build. We chose desktop-first for the
// editor and this view names that decision while still letting a mobile user
// read the structure of the system they own.

type NodeRow = {
  id: string;
  title: string;
  description: string;
  outboundTitles: string[];
};

type SystemSummary = {
  name: string;
  description: string;
  nodes: NodeRow[];
};

type RawNode = { id: string; title: string; description?: string };
type RawPipe = { fromNodeId?: string; toNodeId?: string };
type RawSystem = { name: string; description?: string };

function buildSummary(input: { system: RawSystem; nodes: RawNode[]; pipes: RawPipe[] }): SystemSummary {
  const titleById = new Map<string, string>();
  for (const node of input.nodes) {
    titleById.set(node.id, node.title);
  }
  const outboundByNodeId = new Map<string, string[]>();
  for (const pipe of input.pipes) {
    if (!pipe.fromNodeId || !pipe.toNodeId) continue;
    const targetTitle = titleById.get(pipe.toNodeId);
    if (!targetTitle) continue;
    const existing = outboundByNodeId.get(pipe.fromNodeId) ?? [];
    existing.push(targetTitle);
    outboundByNodeId.set(pipe.fromNodeId, existing);
  }
  const nodes: NodeRow[] = input.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    description: (node.description ?? "").slice(0, 80),
    outboundTitles: outboundByNodeId.get(node.id) ?? [],
  }));
  return {
    name: input.system.name,
    description: input.system.description ?? "",
    nodes,
  };
}

export type MobileSystemViewProps = {
  systemId: string;
};

export function MobileSystemView({ systemId }: MobileSystemViewProps) {
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/systems/${systemId}`, { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setError("Could not load system.");
          return;
        }
        setSummary(buildSummary(body.data));
      } catch {
        if (!cancelled) setError("Could not load system.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  const copyShareLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  const copyEditOnDesktop = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const message = `Open this URL on desktop to edit: ${url}`;
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Copied. Paste on desktop to edit.");
    } catch {
      toast.error("Could not copy");
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-xl mx-auto">
      <DesktopFirstBanner />

      {error ? (
        <p className="t-label text-[#8E8E93]">{error}</p>
      ) : !summary ? (
        <p className="t-label text-[#8E8E93]">Loading...</p>
      ) : (
        <>
          <header className="flex flex-col gap-1">
            <h1 className="t-h2 text-[#111] leading-tight">{summary.name}</h1>
            {summary.description ? (
              <p className="t-body text-[#3C3C43] leading-snug">{summary.description}</p>
            ) : null}
            <p className="t-caption text-[#8E8E93] mt-1">
              Read-only view. The editor opens on desktop.
            </p>
          </header>

          {summary.nodes.length === 0 ? (
            <div className="border border-black/[0.08] rounded-lg p-4 bg-white">
              <p className="t-label text-[#3C3C43]">Empty system. Try desktop to start a build.</p>
            </div>
          ) : (
            <ol className="flex flex-col gap-2" aria-label="Nodes in this system">
              {summary.nodes.map((node) => (
                <li
                  key={node.id}
                  className="border border-black/[0.08] rounded-lg p-3 bg-white"
                >
                  <p className="t-label font-semibold text-[#111] leading-tight">
                    {node.title}
                  </p>
                  {node.description ? (
                    <p className="t-caption text-[#3C3C43] leading-snug mt-1">
                      {node.description}
                      {node.description.length === 80 ? "..." : ""}
                    </p>
                  ) : null}
                  {node.outboundTitles.length > 0 ? (
                    <p className="t-caption text-[#8E8E93] mt-2">
                      to {node.outboundTitles.join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          <div className="border border-black/[0.08] rounded-lg p-4 bg-white flex flex-col gap-2">
            <p className="t-label font-semibold text-[#111]">Edit on desktop</p>
            <p className="t-caption text-[#3C3C43] leading-snug">
              The canvas, drag, and agent build run at full size on a larger screen.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                onClick={copyEditOnDesktop}
                className="inline-flex items-center gap-1.5 t-label font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors"
              >
                <Monitor size={14} /> Edit on desktop
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center gap-1.5 t-label font-medium text-[#111] bg-white border border-black/[0.12] hover:border-black/[0.24] px-3 py-2 rounded-md transition-colors"
              >
                <Copy size={14} /> Copy share link
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
