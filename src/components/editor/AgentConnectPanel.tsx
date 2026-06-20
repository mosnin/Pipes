"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

interface AgentConnectPanelProps {
  systemId: string;
  mcpReadWrite?: boolean;
}

export function AgentConnectPanel({ systemId: _systemId, mcpReadWrite }: AgentConnectPanelProps) {
  const mcpEndpoint = typeof window !== "undefined"
    ? `${window.location.origin}/api/protocol/mcp`
    : "/api/protocol/mcp";

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-2.5">
      <p className="t-label font-semibold text-indigo-900">Connect to any agent</p>
      <div className="space-y-1.5">
        <p className="t-caption text-[#3C3C43]">MCP endpoint:</p>
        <div className="flex items-center gap-1.5">
          <code className="flex-1 bg-white border border-indigo-100 rounded-md px-2 py-1 t-caption font-mono text-indigo-700 truncate">
            {mcpEndpoint}
          </code>
          <button
            onClick={() => { void navigator.clipboard.writeText(mcpEndpoint); toast.success("Endpoint copied"); }}
            className="shrink-0 px-2 py-1 rounded-md bg-indigo-100 hover:bg-indigo-200 t-caption font-medium text-indigo-700 transition-colors"
          >
            <Copy size={11} />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="t-caption text-[#3C3C43]">How to use:</p>
        <ul className="space-y-0.5 t-caption text-[#3C3C43]">
          <li>• <strong>Claude Projects:</strong> Add MCP server with your token</li>
          <li>• <strong>GPT Actions:</strong> Bearer auth with your token</li>
          <li>• <strong>Any agent:</strong> <code className="font-mono text-indigo-700">Authorization: Bearer &lt;token&gt;</code></li>
        </ul>
      </div>
      <a
        href="/settings/tokens"
        className="inline-flex items-center gap-1 t-caption font-semibold text-indigo-700 hover:text-indigo-800 underline-offset-2 hover:underline"
      >
        {mcpReadWrite ? "Manage MCP tokens ->" : "Generate an MCP token ->"}
      </a>
    </div>
  );
}
