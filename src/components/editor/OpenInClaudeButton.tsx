"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, Spinner, Tooltip } from "@/components/ui";

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

type Props = {
  systemId: string;
  hasNodes: boolean;
  onOpenLegacy?: () => void;
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

export function OpenInClaudeButton({ systemId, hasNodes, onOpenLegacy }: Props) {
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastConfig, setLastConfig] = useState<ConfigBlock | null>(null);

  const disabled = !hasNodes || loading;

  const handleClick = async () => {
    if (loading || !hasNodes) return;
    setLoading(true);
    toast.loading("Opening in Claude...", { id: TOAST_ID });
    try {
      const res = await fetch("/api/agent/connect-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId })
      });
      const body = (await res.json()) as
        | { ok: true; data: ConnectClaudeData }
        | { ok: false; error: string };

      if (!res.ok || !body.ok) {
        const message = !body.ok ? body.error : "Could not open in Claude.";
        toast.error(message, {
          id: TOAST_ID,
          action: onOpenLegacy
            ? { label: "Use custom token", onClick: onOpenLegacy }
            : undefined
        });
        return;
      }

      const data = body.data;
      setLastConfig(data.configBlock);

      // Try to open Claude Desktop via the install deep link.
      if (typeof window !== "undefined") {
        window.open(data.claudeDeepLink, "_blank");
      }

      // Fallback: copy the config block to the clipboard a beat later, so
      // users can paste it manually if Claude Desktop is not installed.
      window.setTimeout(() => {
        void copyConfigToClipboard(data.configBlock).then((copied) => {
          toast.success(
            copied
              ? "Opened in Claude. Config also copied to clipboard."
              : "Opened in Claude. Tap Show config to copy manually.",
            {
              id: TOAST_ID,
              action: {
                label: "Show config",
                onClick: () => setShowConfig(true)
              }
            }
          );
        });
      }, FALLBACK_COPY_DELAY_MS);
    } catch (error) {
      toast.error(`Could not open in Claude: ${(error as Error).message}`, {
        id: TOAST_ID,
        action: onOpenLegacy
          ? { label: "Use custom token", onClick: onOpenLegacy }
          : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const tooltipContent = !hasNodes
    ? "Add a node first"
    : "Send this system to Claude Desktop";

  return (
    <>
      <Tooltip content={tooltipContent}>
        <span className="inline-flex">
          <Button
            variant="primary"
            size="sm"
            onPress={handleClick}
            isDisabled={disabled}
            aria-label="Open in Claude"
          >
            {loading && <Spinner size="xs" />}
            <span className="hidden sm:inline">Open in Claude</span>
          </Button>
        </span>
      </Tooltip>

      <Dialog
        open={showConfig}
        onOpenChange={(next) => {
          if (!next) setShowConfig(false);
        }}
        title="Claude Desktop config"
        description="Paste this into your Claude Desktop config to connect."
        size="md"
      >
        {lastConfig ? (
          <pre className="t-mono text-[12px] bg-[#111] text-emerald-300 p-3 rounded-[10px] whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(lastConfig, null, 2)}
          </pre>
        ) : (
          <p className="t-caption text-[#8E8E93]">No config available yet.</p>
        )}
      </Dialog>
    </>
  );
}
