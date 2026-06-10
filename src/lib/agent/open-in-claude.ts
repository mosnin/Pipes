// Shared Open-in-Claude trigger. The same flow as OpenInClaudeButton's click
// handler, extracted so the conversation drawer's PostBuildSuccess can fire
// it without reaching into the topbar.

import { toast } from "sonner";

type ConfigBlock = {
  mcpServers: Record<
    string,
    {
      url: string;
      transport: "http";
      headers: { Authorization: string };
    }
  >;
};

type ConnectClaudeData = {
  token: string;
  mcpUrl: string;
  configBlock: ConfigBlock;
  claudeDeepLink: string;
  expiresAt: string;
  capabilities: string[];
};

const TOAST_ID = "open-in-claude";
const FALLBACK_COPY_DELAY_MS = 600;

async function copyConfigToClipboard(configBlock: ConfigBlock): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(JSON.stringify(configBlock, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function triggerOpenInClaude(systemId: string): Promise<void> {
  toast.loading("Opening in Claude...", { id: TOAST_ID });
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
      const message = !body.ok ? body.error : "Could not open in Claude.";
      toast.error(message, { id: TOAST_ID });
      return;
    }

    const data = body.data;
    if (typeof window !== "undefined") {
      window.open(data.claudeDeepLink, "_blank");
    }
    window.setTimeout(() => {
      void copyConfigToClipboard(data.configBlock).then((copied) => {
        toast.success(
          copied
            ? "Opened in Claude. Config also copied to clipboard."
            : "Opened in Claude. Open the topbar to copy manually.",
          { id: TOAST_ID },
        );
      });
    }, FALLBACK_COPY_DELAY_MS);
  } catch (error) {
    toast.error(`Could not open in Claude: ${(error as Error).message}`, {
      id: TOAST_ID,
    });
  }
}
