"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Key,
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import {
  Button,
  Input,
  Spinner,
  PageHeader,
  Breadcrumbs,
  CardShell,
  CardHeader,
  CardBody,
  Toolbar,
  StatusBadge,
  Dialog,
  DataTable,
  EmptyState,
  Badge,
  HelpText,
  InlineCode,
  KbdHint,
} from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentToken = {
  id: string;
  name: string;
  capabilities: string[];
  systemId?: string;
  tokenPreview: string;
  createdByUserId: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  usageCount?: number;
};

type ConnectionStatus = "idle" | "checking" | "ok" | "fail";

const CAPABILITY_LABELS: Record<string, string> = {
  "systems:read": "View your systems",
  "schema:read": "Export system schemas",
  "validation:read": "Run validation reports",
  "graph:write": "Add/edit nodes and pipes",
  "versions:write": "Create version snapshots",
  "comments:write": "Post comments on systems",
  "systems:write": "Create/delete systems",
  "templates:read": "Browse templates",
  "templates:instantiate": "Instantiate templates",
  "versions:read": "Read version history",
  "import:write": "Import schemas",
};

const RECOMMENDED = ["systems:read", "schema:read"];

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({
  text,
  label,
  variant = "outline",
}: {
  text: string;
  label?: string;
  variant?: "outline" | "ghost";
}) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied");
    });
  };
  return (
    <Button variant={variant} size="sm" onPress={onClick}>
      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : (label ?? "Copy")}
    </Button>
  );
}

function formatRelativeDate(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConnectPage() {
  const [origin, setOrigin] = useState("");
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);

  // New token form (in dialog)
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [name, setName] = useState("My Agent");
  const [capabilities, setCapabilities] = useState<string[]>(RECOMMENDED);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  // Connection test
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("idle");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    try {
      const res = await fetch("/api/settings/tokens");
      const data = await res.json();
      if (data.ok) setTokens(data.data ?? []);
    } finally {
      setLoadingTokens(false);
    }
  }, []);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  const endpoint = `${origin}/api/protocol/mcp`;
  const displayToken = secret ?? "YOUR_TOKEN_HERE";
  const config = `{
  "mcpServers": {
    "pipes": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer ${displayToken}"
      }
    }
  }
}`;

  const toggle = (cap: string) =>
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Token name is required");
      return;
    }
    if (capabilities.length === 0) {
      toast.error("Select at least one capability");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, capabilities }),
      });
      const data = await res.json();
      if (data.ok) {
        setSecret(data.data.secret);
        toast.success("Token created. Copy it now -- it will not be shown again.");
        void loadTokens();
      } else {
        toast.error(data.error ?? "Failed to create token");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    const res = await fetch(`/api/settings/tokens/${tokenId}/revoke`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.ok) {
      toast.success("Token revoked");
      void loadTokens();
    } else {
      toast.error(data.error ?? "Failed to revoke");
    }
  };

  const handleTestConnection = async () => {
    setConnStatus("checking");
    try {
      const res = await fetch(endpoint, { method: "HEAD" });
      if (res.status === 401 || res.status === 200 || res.status === 405) {
        // 401 means endpoint reachable but unauthenticated (expected without bearer)
        setConnStatus("ok");
        toast.success("Endpoint reachable");
      } else {
        setConnStatus("fail");
        toast.error(`Endpoint returned ${res.status}`);
      }
    } catch {
      setConnStatus("fail");
      toast.error("Could not reach endpoint");
    }
  };

  const closeDialog = () => {
    setShowNewDialog(false);
    setSecret(null);
    setName("My Agent");
    setCapabilities(RECOMMENDED);
  };

  // Token table columns
  const columns: DataTableColumn<AgentToken>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="t-label font-semibold text-[#111]">{row.name}</span>
          <InlineCode>{row.tokenPreview}</InlineCode>
        </div>
      ),
    },
    {
      key: "capabilities",
      header: "Capabilities",
      render: (row) => (
        <div className="flex gap-1 flex-wrap max-w-md">
          {row.capabilities.slice(0, 3).map((cap) => (
            <Badge key={cap} tone="neutral">
              {cap}
            </Badge>
          ))}
          {row.capabilities.length > 3 && (
            <Badge tone="neutral">+{row.capabilities.length - 3}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "lastUsedAt",
      header: "Last used",
      width: "140px",
      render: (row) => (
        <span className="t-label text-[#3C3C43]">
          {formatRelativeDate(row.lastUsedAt)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      width: "140px",
      render: (row) => (
        <span className="t-label text-[#3C3C43]">
          {formatRelativeDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (row) =>
        row.revokedAt ? (
          <StatusBadge tone="danger">Revoked</StatusBadge>
        ) : (
          <StatusBadge tone="success" pulse>
            Active
          </StatusBadge>
        ),
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      align: "right",
      render: (row) =>
        row.revokedAt ? null : (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => handleRevoke(row.id)}
          >
            <Trash2 size={14} />
            Revoke
          </Button>
        ),
    },
  ];

  return (
    <div className="surface-subtle min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: "Workspace" }, { label: "Connect" }]} />
        <div className="mt-3">
          <PageHeader
            title="Connect"
            subtitle="Connect AI agents to your systems via the Model Context Protocol."
            actions={
              <Button
                variant="primary"
                size="sm"
                onPress={() => setShowNewDialog(true)}
              >
                <Plus size={14} />
                New token
              </Button>
            }
          />
        </div>

        {/* 3-step quick start */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {[
            {
              n: 1,
              icon: <Key size={16} />,
              title: "Generate a token",
              body: "Create a scoped agent token with the capabilities you want to grant.",
            },
            {
              n: 2,
              icon: <Copy size={16} />,
              title: "Add MCP server",
              body: "Drop the config snippet into your agent (Claude Desktop, IDE, custom).",
            },
            {
              n: 3,
              icon: <Zap size={16} />,
              title: "Build with agents",
              body: "Your agent can now read, edit, and ship systems via the protocol.",
            },
          ].map((s) => (
            <CardShell key={s.n} padded>
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 t-label font-semibold shrink-0">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#3C3C43]">{s.icon}</span>
                    <p className="t-label font-semibold text-[#111]">{s.title}</p>
                  </div>
                  <p className="t-caption text-[#8E8E93] mt-1 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </div>
            </CardShell>
          ))}
        </div>

        {/* Endpoint + test */}
        <CardShell className="mb-4">
          <CardHeader bordered>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="t-overline text-[#8E8E93]">MCP Endpoint</p>
                <p className="t-label font-mono text-[#111] mt-0.5 break-all">
                  {endpoint || "(loading...)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleTestConnection}
                  isDisabled={connStatus === "checking"}
                >
                  {connStatus === "checking" ? (
                    <Spinner size="xs" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Test connection
                </Button>
                {connStatus === "ok" && (
                  <StatusBadge tone="success" pulse>
                    <CircleCheck size={12} />
                    Reachable
                  </StatusBadge>
                )}
                {connStatus === "fail" && (
                  <StatusBadge tone="danger">
                    <CircleAlert size={12} />
                    Unreachable
                  </StatusBadge>
                )}
                <CopyButton text={endpoint} />
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="surface-muted rounded-[10px] overflow-hidden border border-black/[0.06]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.06]">
                <span className="t-overline text-[#8E8E93]">
                  Claude Desktop -- ~/.claude/config.json
                </span>
                <CopyButton text={config} variant="ghost" />
              </div>
              <pre className="px-4 py-3 t-caption font-mono text-[#111] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {config}
              </pre>
            </div>
            <p className="t-caption text-[#8E8E93] mt-3 inline-flex items-center gap-1.5">
              Press
              <KbdHint keys={["N"]} />
              to create a new token, or use the button above.
            </p>
          </CardBody>
        </CardShell>

        {/* Tokens table */}
        <CardShell>
          <Toolbar
            left={
              <div>
                <p className="t-label font-semibold text-[#111]">Agent tokens</p>
                <p className="t-caption text-[#8E8E93] mt-0.5">
                  {tokens.length} total -- secrets shown only at creation time.
                </p>
              </div>
            }
            right={
              <Button
                variant="primary"
                size="sm"
                onPress={() => setShowNewDialog(true)}
              >
                <Plus size={14} />
                New token
              </Button>
            }
          />
          <CardBody className="p-0">
            {loadingTokens ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No tokens yet"
                  description="Create your first agent token to connect Claude or any MCP-compatible client."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => setShowNewDialog(true)}
                    >
                      <Plus size={14} />
                      Create token
                    </Button>
                  }
                />
              </div>
            ) : (
              <DataTable columns={columns} rows={tokens} />
            )}
          </CardBody>
        </CardShell>
      </div>

      {/* New token dialog */}
      <Dialog
        open={showNewDialog}
        onOpenChange={(o) => (o ? setShowNewDialog(true) : closeDialog())}
        title={secret ? "Token created" : "New agent token"}
        description={
          secret
            ? "Copy the secret now. It will not be shown again."
            : "Grant your agent scoped access. Defaults are enough to read systems."
        }
        size="md"
        footer={
          secret ? (
            <Button variant="primary" size="sm" onPress={closeDialog}>
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onPress={closeDialog}
                isDisabled={creating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={handleCreate}
                isDisabled={
                  creating || !name.trim() || capabilities.length === 0
                }
              >
                {creating ? <Spinner size="xs" /> : <Key size={14} />}
                {creating ? "Creating..." : "Create token"}
              </Button>
            </>
          )
        }
      >
        {secret ? (
          <div className="flex flex-col gap-3">
            <div className="surface-inverse rounded-[10px] px-4 py-3 flex items-center gap-2">
              <code className="flex-1 t-caption font-mono text-emerald-300 break-all">
                {secret}
              </code>
              <CopyButton text={secret} />
            </div>
            <HelpText tone="success">
              Stored as a SHA-256 hash. Pipes will never show this again.
            </HelpText>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="token-name" className="t-label font-semibold text-[#111]">
                Token name
              </label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Claude agent"
              />
              <HelpText>Use a descriptive name like the agent or project.</HelpText>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="t-label font-semibold text-[#111]">Capabilities</p>
                <button
                  type="button"
                  onClick={() => setCapabilities(RECOMMENDED)}
                  className="t-caption text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Reset to defaults
                </button>
              </div>
              <div className="border border-black/[0.08] rounded-[10px] overflow-hidden">
                {AGENT_CAPABILITIES.map((cap, i) => {
                  const checked = capabilities.includes(cap);
                  return (
                    <label
                      key={cap}
                      className={
                        "flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#FAFAFA] transition-colors " +
                        (i > 0 ? "border-t border-black/[0.06]" : "")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(cap)}
                        className="mt-1 rounded border-black/[0.2] text-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <InlineCode>{cap}</InlineCode>
                          {RECOMMENDED.includes(cap) && (
                            <StatusBadge tone="info">Default</StatusBadge>
                          )}
                        </div>
                        <p className="t-caption text-[#8E8E93] mt-0.5">
                          {CAPABILITY_LABELS[cap] ?? cap}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
