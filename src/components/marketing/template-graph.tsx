import type { ReactNode } from "react";
import { starterTemplates, type StarterTemplate } from "@/domain/templates/catalog";
import { cn } from "@/lib/utils";

/* ==========================================================================
   A starter template drawn from its own catalog entry: the same nodes, the
   same positions and the same pipes the editor opens with. Nothing here is a
   mockup; change the catalog and the picture changes with it.

   Below `sm` a graph scaled to phone width is unreadable, so the same data
   is set as an ordered list of steps instead.
   ========================================================================== */

const NODE_W = 176;
const NODE_H = 60;
const PAD = 24;

export function findStarterTemplate(id: string): StarterTemplate | undefined {
  return starterTemplates.find((template) => template.id === id);
}

/** Human labels for the schema's node types (`HumanApproval` reads as two words). */
export function nodeTypeLabel(type: string): string {
  if (type === "ExternalApi") return "External API";
  return type.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function pipePath(
  from: StarterTemplate["nodes"][number],
  to: StarterTemplate["nodes"][number],
  ox: number,
  oy: number,
): string {
  const fx = from.x - ox;
  const fy = from.y - oy;
  const tx = to.x - ox;
  const ty = to.y - oy;
  if (tx >= fx + NODE_W + 16) {
    const x1 = fx + NODE_W;
    const y1 = fy + NODE_H / 2;
    const x2 = tx;
    const y2 = ty + NODE_H / 2;
    const dx = (x2 - x1) / 2;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }
  // Stacked nodes (a planner handing to a retriever below it) join
  // bottom to top, so the pipe never doubles back across a node.
  const down = ty > fy;
  const x1 = fx + NODE_W / 2;
  const y1 = down ? fy + NODE_H : fy;
  const x2 = tx + NODE_W / 2;
  const y2 = down ? ty : ty + NODE_H;
  const dy = (y2 - y1) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

/**
 * Turns a left-to-right template into a top-to-bottom column for narrow
 * slots. The editor's horizontal spacing is compressed so the column stays
 * one node plus one pipe per step.
 */
function toVertical(template: StarterTemplate): StarterTemplate {
  return {
    ...template,
    nodes: template.nodes.map((node) => ({ ...node, x: node.y, y: Math.round(node.x * 0.45) })),
  };
}

export function TemplateGraph({
  template: source,
  className,
  listOnMobile = true,
  vertical = false,
}: {
  template: StarterTemplate;
  className?: string;
  listOnMobile?: boolean;
  vertical?: boolean;
}): ReactNode {
  const template = vertical ? toVertical(source) : source;
  const xs = template.nodes.map((n) => n.x);
  const ys = template.nodes.map((n) => n.y);
  const ox = Math.min(...xs) - PAD;
  const oy = Math.min(...ys) - PAD;
  const width = Math.max(...xs) - ox + NODE_W + PAD;
  const height = Math.max(...ys) - oy + NODE_H + PAD;
  const byId = new Map(template.nodes.map((n) => [n.id, n]));
  const markerId = `pipe-arrow-${template.id}`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${template.title}: ${template.nodes.map((n) => n.title).join(", then ")}`}
        className={cn(
          "h-auto w-full",
          vertical && "mx-auto max-w-[260px]",
          listOnMobile && "hidden sm:block",
        )}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 Z" style={{ fill: "var(--line-strong)" }} />
          </marker>
        </defs>
        {template.pipes.map((pipe) => {
          const from = byId.get(pipe.fromNodeId);
          const to = byId.get(pipe.toNodeId);
          if (!from || !to) return null;
          return (
            <path
              key={`${pipe.fromNodeId}-${pipe.toNodeId}`}
              d={pipePath(from, to, ox, oy)}
              fill="none"
              strokeWidth={1.5}
              markerEnd={`url(#${markerId})`}
              style={{ stroke: "var(--line-strong)" }}
            />
          );
        })}
        {template.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x - ox} ${node.y - oy})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={10}
              strokeWidth={1}
              style={{ fill: "var(--surface-raised)", stroke: "var(--line-border)" }}
            />
            <text
              x={14}
              y={23}
              className="t-mono-micro"
              style={{ fill: "var(--text-tertiary)" }}
            >
              {nodeTypeLabel(node.type)}
            </text>
            <text
              x={14}
              y={43}
              className="t-body-medium"
              style={{ fill: "var(--text-primary)" }}
            >
              {node.title}
            </text>
          </g>
        ))}
      </svg>
      {listOnMobile ? <StepList template={template} className="sm:hidden" /> : null}
    </div>
  );
}

/** The graph's steps in pipe order, for narrow screens and for detail pages. */
export function StepList({
  template,
  className,
}: {
  template: StarterTemplate;
  className?: string;
}): ReactNode {
  return (
    <ol className={cn("flex flex-col divide-y divide-hairline", className)}>
      {template.nodes.map((node, index) => (
        <li key={node.id} className="flex items-baseline gap-5 py-4">
          <span className="t-mono-hash w-[2ch] shrink-0 text-ink-4 tabular">
            {index + 1}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="t-body-strong text-ink">{node.title}</span>
            <span className="t-caption text-ink-3">{nodeTypeLabel(node.type)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
