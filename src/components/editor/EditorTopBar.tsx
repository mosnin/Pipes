"use client";

import type { ReactNode } from "react";
import {
  AvatarStack,
  Breadcrumbs,
  Button,
  KbdHint,
  StatusBadge,
  Tooltip,
} from "@/components/ui";
import {
  Bot,
  History,
  MoreHorizontal,
  Play,
  Share2,
  Wand2,
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";

export type EditorTopBarSaveTone = "success" | "warning" | "info" | "neutral" | "danger";

export type EditorTopBarProps = {
  systemName: string;
  systemDescription?: string;
  presenceNames: string[];
  saveLabel: string;
  saveTone: EditorTopBarSaveTone;
  savePulse?: boolean;
  versionLabel?: string;
  onShare: () => void;
  onRunSimulation: () => void;
  onOpenAi: () => void;
  onOpenAgentView: () => void;
  onOpenVersions: () => void;
  onOpenComments: () => void;
  onOpenImport: () => void;
  onArrange: () => void;
  isSimulationActive: boolean;
  isAgentActive: boolean;
  rightExtra?: ReactNode;
};

export function EditorTopBar({
  systemName,
  systemDescription,
  presenceNames,
  saveLabel,
  saveTone,
  savePulse,
  versionLabel,
  onShare,
  onRunSimulation,
  onOpenAi,
  onOpenAgentView,
  onOpenVersions,
  onOpenComments,
  onOpenImport,
  onArrange,
  isSimulationActive,
  isAgentActive,
  rightExtra,
}: EditorTopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 h-14 border-b border-black/[0.08] bg-white/95 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Breadcrumbs
          items={[
            { label: "Workspace", href: "/dashboard" },
            { label: "Systems", href: "/dashboard" },
            { label: systemName },
          ]}
          className="hidden md:flex"
        />
        <div className="md:hidden min-w-0">
          <h1 className="t-label font-semibold text-[#111] truncate">{systemName}</h1>
          {systemDescription && (
            <p className="t-caption text-[#8E8E93] truncate">{systemDescription}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge tone={saveTone} pulse={savePulse}>
          {saveLabel}
        </StatusBadge>
        {versionLabel && (
          <Tooltip content="Current version">
            <span className="inline-flex items-center gap-1 t-caption text-[#3C3C43] bg-[#F5F5F7] border border-black/[0.06] px-2 py-0.5 rounded-md">
              <History size={12} />
              {versionLabel}
            </span>
          </Tooltip>
        )}
        {presenceNames.length > 0 && (
          <Tooltip content={`${presenceNames.length} active viewer${presenceNames.length === 1 ? "" : "s"}`}>
            <AvatarStack names={presenceNames} />
          </Tooltip>
        )}
        <Tooltip content="Share or copy MCP endpoint">
          <Button variant="outline" size="sm" onPress={onShare}>
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </Tooltip>
        <Tooltip content="Run simulation">
          <Button
            variant={isSimulationActive ? "secondary" : "outline"}
            size="sm"
            onPress={onRunSimulation}
          >
            <Play size={14} />
            <span className="hidden sm:inline">Run</span>
          </Button>
        </Tooltip>
        <Tooltip content="Ask AI to edit">
          <Button variant="ghost" size="sm" onPress={onOpenAi}>
            <Wand2 size={14} />
          </Button>
        </Tooltip>
        <Tooltip content={
          <span className="inline-flex items-center gap-1">
            Agent view <KbdHint keys={["A"]} />
          </span>
        }>
          <Button
            variant={isAgentActive ? "secondary" : "primary"}
            size="sm"
            onPress={onOpenAgentView}
          >
            <Bot size={14} />
            <span className="hidden sm:inline">Agent view</span>
          </Button>
        </Tooltip>
        <Dropdown>
          <DropdownTrigger>
            <Button variant="ghost" size="sm" aria-label="More actions">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownTrigger>
          <Dropdown.Popover>
            <DropdownMenu aria-label="More actions">
              <DropdownItem id="arrange" onAction={onArrange}>
                Auto-arrange nodes
              </DropdownItem>
              <DropdownItem id="comments" onAction={onOpenComments}>
                Comments
              </DropdownItem>
              <DropdownItem id="versions" onAction={onOpenVersions}>
                Versions
              </DropdownItem>
              <DropdownItem id="import" onAction={onOpenImport}>
                Import / Export
              </DropdownItem>
            </DropdownMenu>
          </Dropdown.Popover>
        </Dropdown>
        {rightExtra}
      </div>
    </header>
  );
}
