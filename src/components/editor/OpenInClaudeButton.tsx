"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, Spinner, Tooltip } from "@/components/ui";

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

type Props = {
  systemId: string;
  hasNodes: boolean;
  onOpenLegacy?: () => void;
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

// Honest connect flow. Clicking mints a scoped, read-only MCP token and opens
// a dialog with the REAL ways to connect — a `claude mcp add` one-liner, the
// Claude Desktop config block, and the remote-connector URL. No fake deep
// link, no "Opened in Claude" that opened nothing.
export function OpenInClaudeButton({ systemId, hasNodes, onOpenLegacy }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ConnectClaudeData | null>(null);

  const disabled = !hasNodes || loading;

  const handleClick = async () => {
    if (loading || !hasNodes) return;
    setLoading(true);
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
        toast.error(!body.ok ? body.error : "Could not generate a connection.", {
          id: TOAST_ID,
          action: onOpenLegacy ? { label: "Use custom token", onClick: onOpenLegacy } : undefined,
        });
        return;
      }

      setData(body.data);
      setOpen(true);
      toast.success("Connection ready. Copy the command into Claude.", { id: TOAST_ID });
    } catch {
      toast.error("Could not generate a connection.", {
        id: TOAST_ID,
        action: onOpenLegacy ? { label: "Use custom token", onClick: onOpenLegacy } : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const tooltipContent = !hasNodes ? "Add a node first" : "Connect this loop to Claude via MCP";

  return (
    <>
      <Tooltip content={tooltipContent}>
        <span className="inline-flex">
          <Button variant="primary" size="sm" onPress={handleClick} isDisabled={disabled} aria-label="Connect to Claude">
            {loading && <Spinner size="xs" />}
            <span className="hidden sm:inline">Connect to Claude</span>
          </Button>
        </span>
      </Tooltip>

      <Dialog
        open={open}
        onOpenChange={(next) => { if (!next) setOpen(false); }}
        title="Connect this loop to Claude"
        description="This loop is now a live MCP server. Connect it with one command, or paste the config. The token is read-only and expires in 24 hours."
        size="md"
      >
        {data ? (
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="t-overline text-ink-3">Claude Code / CLI</span>
                <button
                  type="button"
                  className="t-caption font-medium text-violet-600 hover:text-violet-700"
                  onClick={() => copyText(data.cliCommand).then((ok) => toast[ok ? "success" : "error"](ok ? "Command copied." : "Copy failed."))}
                >
                  Copy command
                </button>
              </div>
              <pre className="t-mono text-[12px] surface-inverse p-3 rounded-[10px] whitespace-pre-wrap break-all leading-relaxed">
                {data.cliCommand}
              </pre>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="t-overline text-ink-3">Claude Desktop config</span>
                <button
                  type="button"
                  className="t-caption font-medium text-violet-600 hover:text-violet-700"
                  onClick={() => copyText(JSON.stringify(data.configBlock, null, 2)).then((ok) => toast[ok ? "success" : "error"](ok ? "Config copied." : "Copy failed."))}
                >
                  Copy config
                </button>
              </div>
              <pre className="t-mono text-[12px] surface-inverse p-3 rounded-[10px] whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(data.configBlock, null, 2)}
              </pre>
            </section>

            <section className="flex flex-col gap-1.5">
              <span className="t-overline text-ink-3">claude.ai custom connector</span>
              <p className="t-caption text-ink-2">
                In claude.ai, add a custom connector with this URL and an{" "}
                <code className="t-mono">Authorization: Bearer</code> header:
              </p>
              <code className="t-mono text-[12px] text-ink-1 break-all">{data.mcpUrl}</code>
            </section>
          </div>
        ) : (
          <p className="t-caption text-ink-3">No connection generated yet.</p>
        )}
      </Dialog>
    </>
  );
}
