// Shared Connect-to-Claude trigger. Fired by the conversation drawer's
// PostBuildSuccess affordance. Mints a scoped read-only MCP token and copies
// the real `claude mcp add` command to the clipboard so the user can paste it
// straight into Claude Code. No fake deep link.

import { toast } from "sonner";

type ConfigBlock = {
  mcpServers: Record<
    string,
    {
      type: "http";
      url: string;
      headers: { Authorization: string };
    }
  >;
};

type ConnectClaudeData = {
  token: string;
  mcpUrl: string;
  serverName: string;
  configBlock: ConfigBlock;
  cliCommand: string;
  expiresAt: string;
  capabilities: string[];
};

const TOAST_ID = "connect-claude";

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function triggerOpenInClaude(systemId: string): Promise<void> {
  toast.loading("Generating a Claude connection...", { id: TOAST_ID });
  try {
    const res = await fetch("/api/agent/connect-claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId }),
    });
    const body = (await res.json()) as
      | { ok: true; data: ConnectClaudeData }
      | { ok: false; error: string };

    if (!res.ok || !body.ok) {
      toast.error(!body.ok ? body.error : "Could not generate a connection.", { id: TOAST_ID });
      return;
    }

    const copied = await copyText(body.data.cliCommand);
    toast.success(
      copied
        ? "Connection ready — `claude mcp add` command copied. Paste it into Claude Code."
        : "Connection ready. Open the Connect to Claude dialog to copy the command.",
      { id: TOAST_ID },
    );
  } catch {
    toast.error("Could not generate a connection.", { id: TOAST_ID });
  }
}
