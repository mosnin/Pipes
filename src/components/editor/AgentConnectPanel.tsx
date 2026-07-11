"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui";

interface AgentConnectPanelProps {
  systemId: string;
  mcpReadWrite?: boolean;
}

interface TokenSummary {
  id: string;
  name: string;
  tokenPreview: string;
  capabilities: string[];
}

interface CreatedToken {
  id: string;
  name: string;
  secret: string;
  tokenPreview: string;
  authHeaderExample: string;
}

function copyText(text: string, label: string) {
  void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

export function AgentConnectPanel({ systemId, mcpReadWrite }: AgentConnectPanelProps) {
  const mcpEndpoint = typeof window !== "undefined"
    ? `${window.location.origin}/api/protocol/mcp`
    : "/api/protocol/mcp";

  const [tokens, setTokens] = useState<TokenSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("Editor token");
  const [createdSecret, setCreatedSecret] = useState<CreatedToken | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/settings/tokens");
        const body = await res.json() as { ok: boolean; data?: TokenSummary[] };
        if (body.ok && Array.isArray(body.data)) setTokens(body.data);
        else setTokens([]);
      } catch {
        setTokens([]);
      }
    })();
  }, []);

  async function handleCreateToken() {
    setCreating(true);
    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newTokenName.trim() || "Editor token",
          capabilities: mcpReadWrite
            ? ["systems:read", "graph:write", "schema:read"]
            : ["systems:read", "schema:read"],
          systemId,
          expiresInDays: 365,
        }),
      });
      const body = await res.json() as { ok: boolean; data?: CreatedToken; error?: string };
      if (!body.ok) throw new Error(body.error ?? "Failed to create token");
      setCreatedSecret(body.data!);
      setTokens((prev) => prev ? [{ id: body.data!.id, name: body.data!.name, tokenPreview: body.data!.tokenPreview, capabilities: [] }, ...prev] : null);
      setShowForm(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const hasTokens = tokens !== null && tokens.length > 0;
  const loading = tokens === null;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-3">
      <p className="t-label font-semibold text-indigo-900">Connect to any agent</p>

      {/* MCP endpoint */}
      <div className="space-y-1">
        <p className="t-caption text-ink-2">MCP endpoint</p>
        <div className="flex items-center gap-1.5">
          <code className="flex-1 surface-canvas border border-indigo-100 rounded-md px-2 py-1 t-caption font-mono text-indigo-700 truncate text-[10px]">
            {mcpEndpoint}
          </code>
          <button
            onClick={() => copyText(mcpEndpoint, "Endpoint")}
            className="shrink-0 p-1.5 rounded-md bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
            title="Copy endpoint"
          >
            <Copy size={11} />
          </button>
        </div>
      </div>

      {/* Token section */}
      <div className="space-y-1.5">
        <p className="t-caption text-ink-2">Access token</p>

        {loading ? (
          <div className="flex items-center gap-2 py-1">
            <Spinner size="xs" />
            <span className="t-caption text-ink-3">Loading tokens...</span>
          </div>
        ) : createdSecret ? (
          /* Newly created token — show full value once */
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 space-y-1.5">
            <p className="t-caption font-semibold text-amber-800">Save this token — shown once</p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 surface-canvas border border-amber-200 rounded-md px-2 py-1 t-caption font-mono text-amber-800 truncate text-[10px]">
                {createdSecret.secret}
              </code>
              <button
                onClick={() => copyText(createdSecret.secret, "Token")}
                className="shrink-0 p-1.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                title="Copy token"
              >
                <Copy size={11} />
              </button>
            </div>
            <button
              className="t-caption text-amber-700 underline-offset-2 hover:underline"
              onClick={() => copyText(createdSecret.authHeaderExample, "Auth header")}
            >
              Copy auth header example
            </button>
          </div>
        ) : hasTokens ? (
          /* Show first token preview */
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <code className="flex-1 surface-canvas border border-indigo-100 rounded-md px-2 py-1 t-caption font-mono text-indigo-700 truncate text-[10px]">
                {tokens[0].tokenPreview}
              </code>
              <span className="t-caption text-ink-3 shrink-0">{tokens[0].name}</span>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 t-caption text-indigo-600 hover:text-indigo-700"
            >
              <Plus size={10} />
              New token
            </button>
          </div>
        ) : showForm ? null : (
          /* No tokens — prompt to create */
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 w-full justify-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white t-caption font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Zap size={11} />
            Generate your first token
          </button>
        )}

        {/* Inline create form */}
        {showForm && !createdSecret && (
          <div className="rounded-lg surface-canvas border border-indigo-200 p-2 space-y-2">
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Token name"
              className="w-full px-2 py-1 rounded-md border border-line t-caption outline-none focus:border-indigo-400 text-ink-1"
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreateToken(); }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => void handleCreateToken()}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-indigo-600 text-white t-caption font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {creating ? <Spinner size="xs" /> : <Zap size={10} />}
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-2 py-1 rounded-md bg-[var(--surface-subtle)] t-caption text-ink-2 hover:bg-[#EBEBED] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How to use */}
      <div className="space-y-1 pt-1 border-t border-indigo-100">
        <ul className="space-y-0.5 t-caption text-ink-2">
          <li>&#x2022; <strong>Claude Projects:</strong> Add MCP server with your token</li>
          <li>&#x2022; <strong>GPT Actions:</strong> Bearer auth with your token</li>
          <li>&#x2022; <strong>Any agent:</strong> <code className="font-mono text-indigo-700">Authorization: Bearer &lt;token&gt;</code></li>
        </ul>
      </div>

      <a
        href="/settings/tokens"
        className="inline-flex items-center gap-1 t-caption text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
      >
        Manage all tokens &#x2192;
      </a>
    </div>
  );
}
