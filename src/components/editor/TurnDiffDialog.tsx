"use client";

// Modal that shows the diff between two snapshots. Three sections: Added,
// Removed, Updated. Opened from a "See diff" link on the build summary line.
// Diff is computed by `turn-diff.ts` and is purely visual — it does not
// mutate state.

import { useMemo } from "react";
import { Button, Dialog } from "@/components/ui";
import { computeTurnDiff, type TurnSnapshot } from "@/lib/agent/turn-diff";
import type { GraphNode } from "@/components/editor/editor_state";

export type TurnDiffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turnIndex: number;
  before: TurnSnapshot;
  after: TurnSnapshot;
};

function nodeLabel(n: GraphNode): string {
  return n.title || n.id;
}

function pipeLabel(from: string | undefined, to: string | undefined, nodes: GraphNode[]): string {
  const lookup = (id?: string) => nodes.find((n) => n.id === id)?.title ?? id ?? "?";
  return `${lookup(from)} -> ${lookup(to)}`;
}

export function TurnDiffDialog({
  open,
  onOpenChange,
  turnIndex,
  before,
  after,
}: TurnDiffDialogProps) {
  const diff = useMemo(() => computeTurnDiff(before, after), [before, after]);
  const allNodes = useMemo(() => [...before.nodes, ...after.nodes], [before.nodes, after.nodes]);

  const empty =
    diff.nodesAdded.length === 0 &&
    diff.nodesRemoved.length === 0 &&
    diff.nodesUpdated.length === 0 &&
    diff.pipesAdded.length === 0 &&
    diff.pipesRemoved.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Changes in turn ${turnIndex}`}
      description="Compared with the canvas state from the previous turn."
      size="md"
      footer={
        <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {empty ? (
        <p className="t-label text-ink-3 py-2">No graph changes in this turn.</p>
      ) : (
        <div className="space-y-4">
          <Section
            title="Added"
            tone="positive"
            empty={diff.nodesAdded.length === 0 && diff.pipesAdded.length === 0}
          >
            {diff.nodesAdded.map((n) => (
              <Row key={`add-node-${n.id}`} text={nodeLabel(n)} kind="node" />
            ))}
            {diff.pipesAdded.map((p) => (
              <Row
                key={`add-pipe-${p.id}`}
                text={pipeLabel(p.fromNodeId, p.toNodeId, allNodes)}
                kind="pipe"
              />
            ))}
          </Section>

          <Section
            title="Removed"
            tone="negative"
            empty={diff.nodesRemoved.length === 0 && diff.pipesRemoved.length === 0}
          >
            {diff.nodesRemoved.map((n) => (
              <Row key={`rm-node-${n.id}`} text={nodeLabel(n)} kind="node" tone="negative" />
            ))}
            {diff.pipesRemoved.map((p) => (
              <Row
                key={`rm-pipe-${p.id}`}
                text={pipeLabel(p.fromNodeId, p.toNodeId, allNodes)}
                kind="pipe"
                tone="negative"
              />
            ))}
          </Section>

          <Section title="Updated" tone="neutral" empty={diff.nodesUpdated.length === 0}>
            {diff.nodesUpdated.map((u) => (
              <div
                key={`upd-${u.id}`}
                className="grid grid-cols-2 gap-3 border border-line rounded-md p-2"
              >
                <div>
                  <p className="t-caption text-ink-3 mb-0.5">Before</p>
                  <p className="t-label text-ink-2 truncate">{nodeLabel(u.before)}</p>
                  {u.before.description ? (
                    <p className="t-caption text-ink-3 truncate">{u.before.description}</p>
                  ) : null}
                </div>
                <div>
                  <p className="t-caption text-ink-3 mb-0.5">After</p>
                  <p className="t-label text-ink-1 truncate">{nodeLabel(u.after)}</p>
                  {u.after.description ? (
                    <p className="t-caption text-ink-2 truncate">{u.after.description}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </Section>
        </div>
      )}
    </Dialog>
  );
}

function Section({
  title,
  tone,
  empty,
  children,
}: {
  title: string;
  tone: "positive" | "negative" | "neutral";
  empty: boolean;
  children: React.ReactNode;
}) {
  const dot =
    tone === "positive"
      ? "bg-emerald-500"
      : tone === "negative"
        ? "bg-red-500"
        : "bg-[#8E8E93]";
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden />
        <h3 className="t-label font-semibold text-ink-1">{title}</h3>
      </div>
      {empty ? (
        <p className="t-caption text-ink-3 pl-3">Nothing.</p>
      ) : (
        <div className="space-y-1 pl-3">{children}</div>
      )}
    </div>
  );
}

function Row({
  text,
  kind,
  tone = "positive",
}: {
  text: string;
  kind: "node" | "pipe";
  tone?: "positive" | "negative";
}) {
  const color = tone === "negative" ? "text-red-600" : "text-ink-2";
  return (
    <p className={`t-label ${color} truncate`}>
      <span className="t-caption text-ink-3 mr-1.5">{kind}</span>
      {text}
    </p>
  );
}
