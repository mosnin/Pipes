"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";

export type PortDirection = "input" | "output";

export type PortAffordanceData = {
  nodeId: string;
  direction: PortDirection;
  portType: string;
  connectedPipeId?: string;
  connectedPeerTitle?: string;
};

export type PortAffordanceProps = {
  anchor: { x: number; y: number } | null;
  port: PortAffordanceData | null;
  onClose: () => void;
  onConnect?: (port: PortAffordanceData) => void;
  onDisconnect?: (pipeId: string) => void;
  onEditType?: (nodeId: string, direction: PortDirection) => void;
  onHighlightPipe?: (pipeId: string) => void;
};

const PORT_TYPE_LABEL: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  json: "json",
  event: "event",
  file: "file",
  any: "any",
};

export function PortAffordance({
  anchor,
  port,
  onClose,
  onConnect,
  onDisconnect,
  onEditType,
  onHighlightPipe,
}: PortAffordanceProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!port) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Defer the listeners by a frame so the click that opened us doesn't
    // immediately close us.
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [port, onClose]);

  if (!mounted || !port || !anchor) return null;

  const directionLabel = port.direction === "input" ? "Input" : "Output";
  const typeLabel = PORT_TYPE_LABEL[port.portType] ?? port.portType;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`${directionLabel} port`}
      data-testid="port-affordance"
      className="fixed z-50 w-64 surface-canvas rounded-xl border border-line shadow-xl-token p-3"
      style={{
        left: Math.max(8, Math.min(anchor.x, window.innerWidth - 264)),
        top: Math.max(8, Math.min(anchor.y, window.innerHeight - 220)),
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="t-caption font-semibold text-ink-1">
          {directionLabel}
        </span>
        <span className="t-micro text-ink-3 uppercase">{typeLabel}</span>
      </div>

      <div className="space-y-1.5 mb-3">
        {port.connectedPipeId ? (
          <button
            type="button"
            onClick={() => onHighlightPipe?.(port.connectedPipeId!)}
            className="w-full text-left px-2 py-1.5 rounded-md bg-[var(--surface-subtle)] hover:bg-[var(--color-hover)] transition-colors"
          >
            <p className="t-micro text-ink-3">Connected to</p>
            <p className="t-caption text-ink-1 truncate">
              {port.connectedPeerTitle ?? port.connectedPipeId}
            </p>
          </button>
        ) : (
          <p className="t-caption text-ink-3">No connection.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            onConnect?.(port);
            onClose();
          }}
        >
          {port.direction === "output" ? "Connect downstream" : "Connect upstream"}
        </Button>
        {port.connectedPipeId && (
          <Button
            variant="danger-soft"
            size="sm"
            onClick={() => {
              onDisconnect?.(port.connectedPipeId!);
              onClose();
            }}
          >
            Disconnect
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onEditType?.(port.nodeId, port.direction);
            onClose();
          }}
        >
          Edit type
        </Button>
      </div>
    </div>,
    document.body,
  );
}
