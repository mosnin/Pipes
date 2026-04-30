"use client";

import { AvatarStack, StatusBadge, Tooltip } from "@/components/ui";
import { CircleDot, GitBranch, Wifi } from "lucide-react";

export type EditorStatusBarProps = {
  validationErrors: number;
  validationWarnings: number;
  simulationStatus: string;
  simulationSteps: number;
  presenceNames: string[];
  connected: boolean;
  zoomLevel: number;
  saveLabel: string;
  saveTone: "success" | "warning" | "info" | "neutral" | "danger";
  savePulse?: boolean;
};

export function EditorStatusBar({
  validationErrors,
  validationWarnings,
  simulationStatus,
  simulationSteps,
  presenceNames,
  connected,
  zoomLevel,
  saveLabel,
  saveTone,
  savePulse = false,
}: EditorStatusBarProps) {
  const validationTone: "success" | "warning" | "danger" =
    validationErrors > 0 ? "danger" : validationWarnings > 0 ? "warning" : "success";
  const validationLabel =
    validationErrors > 0
      ? `${validationErrors} error${validationErrors === 1 ? "" : "s"}`
      : validationWarnings > 0
        ? `${validationWarnings} warning${validationWarnings === 1 ? "" : "s"}`
        : "Clean";

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-20 flex items-center justify-between gap-3 px-3 py-1.5 border-t border-black/[0.08] bg-white/85 backdrop-blur-md"
      style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
    >
      <div className="flex items-center gap-2">
        <Tooltip content="Validation status" side="top">
          <StatusBadge tone={validationTone}>{validationLabel}</StatusBadge>
        </Tooltip>
        <Tooltip content="Simulation status" side="top">
          <StatusBadge
            tone={simulationStatus === "ok" ? "success" : simulationStatus === "blocked" ? "danger" : "info"}
          >
            <CircleDot size={11} className="mr-0.5" />
            {simulationStatus} . {simulationSteps} step{simulationSteps === 1 ? "" : "s"}
          </StatusBadge>
        </Tooltip>
        <Tooltip content="Save status" side="top">
          <StatusBadge tone={saveTone} pulse={savePulse}>
            <GitBranch size={11} className="mr-0.5" />
            {saveLabel}
          </StatusBadge>
        </Tooltip>
      </div>
      <div className="flex items-center gap-3">
        {presenceNames.length > 0 && (
          <Tooltip content={`${presenceNames.length} viewer${presenceNames.length === 1 ? "" : "s"}`}>
            <AvatarStack names={presenceNames} />
          </Tooltip>
        )}
        <span className="t-caption text-[#8E8E93] tabular-nums">{Math.round(zoomLevel * 100)}%</span>
        <Tooltip content={connected ? "Connected" : "Offline"}>
          <span className="inline-flex items-center gap-1 t-caption text-[#8E8E93]">
            <Wifi size={12} className={connected ? "text-emerald-600" : "text-[#C7C7CC]"} />
            {connected ? "Live" : "Offline"}
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
