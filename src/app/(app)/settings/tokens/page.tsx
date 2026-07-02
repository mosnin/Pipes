"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Plus, Trash2 } from "lucide-react";
import { AGENT_CAPABILITIES, type AgentCapability } from "@/lib/protocol/tokens";
import { MCP_TOOL_COUNT } from "@/lib/protocol/mcp-tools";
import { LoopUpgradeGate } from "@/components/editor/LoopUpgradeGate";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  CardFooter,
  DataTable,
  Dialog,
  EmptyState,
  HelpText,
  InlineCode,
  PageHeader,
  Spinner,
  SkeletonSettingsSection,
  StatusBadge,
  type DataTableColumn,
} from "@/components/ui";

// ── types ──────────────────────────────────────────────────────────────────

interface TokenRow {
  id: string;
  name: string;
  tokenPreview?: string;
  capabilities?: string[];
  createdAt?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
}

const CAPABILITY_LABELS: Record<string, string> = {
  "systems:read":          "Read systems",
  "systems:write":         "Write systems",
  "schema:read":           "Read schema",
  "templates:read":        "Read templates",
  "templates:instantiate": "Instantiate templates",
  "versions:read":         "Read versions",
  "versions:write":        "Write versions",
  "graph:write":           "Write graph",
  "comments:write":        "Write comments",
  "import:write":          "Write imports",
  "validation:read":       "Read validation",
};

const EXPIRATION_OPTIONS: Array<{ id: string; label: string; days: number | null }> = [
  { id: "30",     label: "30 days",  days: 30  },
  { id: "60",     label: "60 days",  days: 60  },
  { id: "90",     label: "90 days",  days: 90  },
  { id: "180",    label: "180 days", days: 180 },
  { id: "365",    label: "1 year",   days: 365 },
  { id: "never",  label: "No expiration", days: null },
];

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Never";
  }
}

// ── page ──────────────────────────────────────────────────────────────────

export default function TokensSettingsPage() {
  const [tokens, setTokens]         = useState<TokenRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [apiMcpAccess, setApiMcpAccess] = useState<boolean | null>(null);

  // ── Generate dialog state ─────────────────────────────────────────────────
  const [generateOpen, setGenerateOpen] = useState(false);
  const [name, setName]                 = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["systems:read", "schema:read"]);
  const [expiration, setExpiration]     = useState<string>("90");
  const [creating, setCreating]         = useState(false);
  const [nameTouched, setNameTouched]   = useState(false);

  const nameError = nameTouched && !name.trim() ? "Token name is required" : null;

  // ── Secret dialog state ───────────────────────────────────────────────────
  const [secret, setSecret]         = useState<string | null>(null);
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [copiedId, setCopiedId]     = useState<string | null>(null);

  // ── Revoke dialog state ───────────────────────────────────────────────────
  const [revokeTarget, setRevokeTarget] = useState<TokenRow | null>(null);
  const [revoking, setRevoking]         = useState(false);

  // ── load ──────────────────────────────────────────────────────────────────
  function load() {
    setLoading(true);
    return Promise.all([
      fetch("/api/settings/tokens").then((r) => r.json()).then((d: { data?: TokenRow[] }) => setTokens(d.data ?? [])),
      fetch("/api/billing/status").then((r) => r.json()).then((d: { data?: { entitlements?: { apiMcpAccess?: boolean } } }) => {
        setApiMcpAccess(d.data?.entitlements?.apiMcpAccess ?? false);
      }),
    ]).finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setNameTouched(true);
    if (!name.trim()) return;
    setCreating(true);
    try {
      const expDays = EXPIRATION_OPTIONS.find((o) => o.id === expiration)?.days ?? null;
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          capabilities,
          expiresInDays: expDays,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSecret(data.data.secret);
        setAuthHeader(data.data.authHeaderExample);
        setGenerateOpen(false);
        setName("");
        setNameTouched(false);
        setCapabilities(["systems:read", "schema:read"]);
        setExpiration("90");
        toast.success("Token created - copy it now");
      } else {
        toast.error(data.error ?? "Failed to create token");
      }
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await fetch(`/api/settings/tokens/${revokeTarget.id}/revoke`, { method: "POST" });
      await load();
      toast.success("Token revoked");
    } catch {
      toast.error("Failed to revoke token");
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
      toast.success("Copied to clipboard");
    }).catch(() => {
      toast.error("Could not copy — please select and copy manually");
    });
  };

  const toggleCapability = (cap: string, checked: boolean) => {
    setCapabilities((prev) =>
      checked ? [...prev, cap] : prev.filter((x) => x !== cap),
    );
  };

  // ── columns ───────────────────────────────────────────────────────────────
  const columns: DataTableColumn<TokenRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="t-label font-medium text-ink-1">{row.name}</span>
            {row.tokenPreview && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(`Bearer ${row.tokenPreview!}`).then(() => {
                    toast.success("Bearer token copied");
                  });
                }}
                title="Copy Bearer token"
                className="group inline-flex items-center gap-1 w-fit"
              >
                <code className="t-mono text-[11px] text-ink-3 group-hover:text-indigo-600 transition-colors">
                  {row.tokenPreview}&hellip;
                </code>
                <Copy size={10} className="text-ink-4 group-hover:text-indigo-500 transition-colors" />
              </button>
            )}
          </div>
        ),
      },
      {
        key: "capabilities",
        header: "Capabilities",
        render: (row) => {
          const caps = row.capabilities ?? [];
          if (caps.length === 0) return <span className="t-caption text-ink-4">None</span>;
          const visible = caps.slice(0, 3);
          const overflow = caps.length - visible.length;
          return (
            <div className="flex flex-wrap gap-1 max-w-xs">
              {visible.map((cap) => (
                <InlineCode key={cap} className="t-micro">
                  {cap}
                </InlineCode>
              ))}
              {overflow > 0 && (
                <span className="t-caption text-ink-3">+{overflow} more</span>
              )}
            </div>
          );
        },
      },
      {
        key: "createdAt",
        header: "Created",
        width: "120px",
        render: (row) => (
          <span className="t-caption text-ink-3">{formatDate(row.createdAt)}</span>
        ),
      },
      {
        key: "lastUsedAt",
        header: "Last used",
        width: "120px",
        render: (row) => (
          <span className="t-caption text-ink-3">{formatDate(row.lastUsedAt)}</span>
        ),
      },
      {
        key: "expiresAt",
        header: "Expires",
        width: "120px",
        render: (row) => (
          <span className="t-caption text-ink-3">{formatDate(row.expiresAt)}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "100px",
        render: (row) => (
          <StatusBadge tone={row.revokedAt ? "danger" : "success"}>
            {row.revokedAt ? "Revoked" : "Active"}
          </StatusBadge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "80px",
        align: "right",
        render: (row) =>
          row.revokedAt ? null : (
            <Button
              size="sm"
              variant="ghost"
              onPress={() => setRevokeTarget(row)}
              className="text-[#991B1B] hover:bg-[#FEF2F2]"
              aria-label={`Revoke ${row.name}`}
            >
              <Trash2 size={13} />
            </Button>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Developer"
        subtitle="API tokens and integrations."
        actions={
          apiMcpAccess === false ? null : (
            <Button
              variant="primary"
              onPress={() => setGenerateOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus size={14} />
              Generate token
            </Button>
          )
        }
      />

      {/* ── Tokens table ──────────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="t-title text-ink-1">Active tokens</h2>
              <p className="mt-1 t-caption text-ink-3">
                Tokens are SHA-256 hashed before storage; the secret is shown once at creation.
              </p>
            </div>
            <HelpText>
              {loading
                ? "Loading..."
                : `${tokens.length} token${tokens.length === 1 ? "" : "s"}`}
            </HelpText>
          </div>
        </CardHeader>
        {loading ? (
          <CardBody>
            <SkeletonSettingsSection />
          </CardBody>
        ) : apiMcpAccess === false ? (
          <CardBody>
            <LoopUpgradeGate reason="mcp_access" />
          </CardBody>
        ) : tokens.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No tokens yet"
              description="Generate a token to start integrating with the Looper Protocol API or MCP."
              action={
                <Button
                  variant="primary"
                  onPress={() => setGenerateOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Generate token
                </Button>
              }
            />
          </CardBody>
        ) : (
          <DataTable columns={columns} rows={tokens} />
        )}
      </CardShell>

      {/* ── How to use card ───────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <h2 className="t-title text-ink-1">How to use your token</h2>
          <p className="mt-1 t-caption text-ink-3">
            Paste this token into any agent to give it read/write access to your loops.
          </p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* MCP endpoint — always show the full URL first */}
          <div className="space-y-2">
            <p className="t-label font-semibold text-ink-1">MCP endpoint</p>
            <p className="t-caption text-ink-2">
              Point any agent at this URL. It serves {MCP_TOOL_COUNT} tools covering systems, graphs, templates, versions, validation, and blueprints.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-[#0B0B0F] px-4 py-3">
              <code className="flex-1 t-mono text-[12px] text-[#7DD3FC] break-all">
                {typeof window !== "undefined" ? `${window.location.origin}/api/protocol/mcp` : "/api/protocol/mcp"}
              </code>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/api/protocol/mcp`;
                  void navigator.clipboard.writeText(url).then(() => toast.success("Endpoint URL copied"));
                }}
                className="shrink-0 text-ink-3 hover:text-white transition-colors"
                aria-label="Copy endpoint URL"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
          {/* Claude Projects / Claude Code */}
          <div className="space-y-2">
            <p className="t-label font-semibold text-ink-1">Claude Projects or Claude Code</p>
            <p className="t-caption text-ink-2">
              In Claude Projects, go to Project settings → MCP Servers → Add server. In Claude Code, add to <InlineCode>.claude/settings.json</InlineCode> under <InlineCode>mcpServers</InlineCode>.
            </p>
            <div className="rounded-lg bg-[#0B0B0F] px-4 py-3 space-y-0.5 overflow-x-auto">
              <code className="block t-mono text-[12px] text-ink-3">{`{`}</code>
              <code className="block t-mono text-[12px] text-ink-3 pl-4">{`"mcpServers": {`}</code>
              <code className="block t-mono text-[12px] text-ink-3 pl-8">{`"looper": {`}</code>
              <code className="block t-mono text-[12px] text-[#7DD3FC] pl-12">{`"url": "`}<span className="text-[#86EFAC]">{typeof window !== "undefined" ? `${window.location.origin}/api/protocol/mcp` : "/api/protocol/mcp"}</span>{`",`}</code>
              <code className="block t-mono text-[12px] text-ink-3 pl-12">{`"headers": { "Authorization": "`}<span className="text-[#FCD34D]">Bearer ptk_your_token_here</span>{`" }`}</code>
              <code className="block t-mono text-[12px] text-ink-3 pl-8">{`}`}</code>
              <code className="block t-mono text-[12px] text-ink-3 pl-4">{`}`}</code>
              <code className="block t-mono text-[12px] text-ink-3">{`}`}</code>
            </div>
          </div>
          {/* Any HTTP client */}
          <div className="space-y-2">
            <p className="t-label font-semibold text-ink-1">Any HTTP client or agent framework</p>
            <p className="t-caption text-ink-2">
              Pass the token as a Bearer token in the <InlineCode>Authorization</InlineCode> header on every POST request to the endpoint above.
            </p>
            <div className="rounded-lg bg-[#0B0B0F] px-4 py-3 space-y-0.5">
              <code className="block t-mono text-[12px] text-ink-3">
                POST <span className="text-[#7DD3FC]">{typeof window !== "undefined" ? `${window.location.origin}/api/protocol/mcp` : "/api/protocol/mcp"}</span>
              </code>
              <code className="block t-mono text-[12px] text-ink-3">
                Authorization: Bearer <span className="text-[#FCD34D]">ptk_your_token_here</span>
              </code>
              <code className="block t-mono text-[12px] text-ink-3">
                Content-Type: application/json
              </code>
            </div>
          </div>
        </CardBody>
      </CardShell>

      {/* ── Generate dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={generateOpen}
        onOpenChange={(o) => {
          setGenerateOpen(o);
          if (!o) {
            setName("");
            setNameTouched(false);
          }
        }}
        title="Generate a token"
        description="Pick a descriptive name and only the capabilities you need."
        size="md"
        footer={
          <>
            <Button variant="ghost" onPress={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isDisabled={creating || capabilities.length === 0 || !name.trim()}
              onPress={() => void handleCreate()}
              className="flex items-center gap-1.5"
            >
              {creating && <Spinner size="sm" />}
              Generate
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token-name" className="t-label font-medium text-ink-1">
              Token name
            </label>
            <input
              id="token-name"
              type="text"
              placeholder="e.g. CI pipeline, Claude agent"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              onBlur={() => setNameTouched(true)}
              className={
                nameError
                  ? "w-full h-10 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 t-label text-[#991B1B] outline-none focus:ring-2 focus:ring-red-100"
                  : "w-full h-10 rounded-lg border border-line surface-canvas px-3 t-label text-ink-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              }
            />
            {nameError && <HelpText tone="error">{nameError}</HelpText>}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="t-label font-medium text-ink-1">Capabilities</span>
            <HelpText>Grant only what is needed. Select at least one.</HelpText>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1 border border-[var(--color-line)] rounded-md p-2">
              {AGENT_CAPABILITIES.map((cap: AgentCapability) => {
                const checked = capabilities.includes(cap);
                return (
                  <label
                    key={cap}
                    className="flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[var(--color-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleCapability(cap, e.target.checked)}
                      className="mt-0.5 accent-indigo-600 w-4 h-4"
                    />
                    <span className="flex flex-col">
                      <InlineCode className="t-micro w-fit">{cap}</InlineCode>
                      <span className="t-caption text-ink-3 mt-0.5">
                        {CAPABILITY_LABELS[cap] ?? cap}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {capabilities.length === 0 && (
              <HelpText tone="error">Select at least one capability to generate a token.</HelpText>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="token-expiration" className="t-label font-medium text-ink-1">
              Expiration
            </label>
            <select
              id="token-expiration"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="w-full h-10 rounded-lg border border-line surface-canvas px-3 t-label text-ink-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {EXPIRATION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>

      {/* ── Secret display dialog ─────────────────────────────────────────── */}
      <Dialog
        open={secret != null}
        onOpenChange={(o) => {
          if (!o) {
            setSecret(null);
            setAuthHeader(null);
          }
        }}
        title="Token created"
        description="Copy and store this secret now. It will not be shown again."
        size="md"
        footer={
          <Button
            variant="primary"
            onPress={() => {
              setSecret(null);
              setAuthHeader(null);
            }}
          >
            Done
          </Button>
        }
      >
        {secret && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 t-label text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] rounded-md px-3 py-2">
              <CheckCircle2 size={14} />
              Token generated successfully.
            </div>
            <HelpText tone="error">
              For your security, this secret will not be shown again. Store it somewhere safe.
            </HelpText>

            <CardFooter className="bg-[#0B0B0F] rounded-lg border-0 px-3 py-2 flex items-center justify-between">
              <code className="flex-1 t-mono text-[12px] text-[#86EFAC] break-all">
                {secret}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleCopy(secret, "secret")}
                className="text-white hover:bg-white/10 ml-2"
                aria-label="Copy token"
              >
                {copiedId === "secret" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </Button>
            </CardFooter>

            {authHeader && (
              <div className="space-y-1.5">
                <div className="t-label font-medium text-ink-1">Authorization header</div>
                <CardFooter className="bg-[#0B0B0F] rounded-lg border-0 px-3 py-2 flex items-center justify-between">
                  <code className="flex-1 t-mono text-[12px] text-[#7DD3FC] break-all">
                    {authHeader}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleCopy(authHeader, "authHeader")}
                    className="text-white hover:bg-white/10 ml-2"
                    aria-label="Copy authorization header"
                  >
                    {copiedId === "authHeader" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  </Button>
                </CardFooter>
              </div>
            )}

            <div className="border-t border-line pt-3 space-y-2">
              <div className="t-label font-semibold text-ink-1">Next step: connect an agent</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-[80px] t-caption text-ink-3 shrink-0">Endpoint</div>
                  <div className="flex-1 flex items-center gap-1.5">
                    <code className="flex-1 bg-[var(--surface-subtle)] border border-line rounded px-2 py-1 t-caption font-mono text-indigo-700 truncate">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/protocol/mcp` : "/api/protocol/mcp"}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/api/protocol/mcp`;
                        navigator.clipboard.writeText(url).then(() => {
                          toast.success("Endpoint copied");
                        }).catch(() => {
                          toast.error("Could not copy — please select and copy manually");
                        });
                      }}
                      className="shrink-0 px-2 py-1 rounded bg-[var(--surface-subtle)] hover:bg-[var(--color-hover-strong)] t-caption text-ink-2 transition-colors"
                      aria-label="Copy MCP endpoint"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--surface-subtle)] rounded-lg p-3 space-y-1.5 t-caption text-ink-2">
                <div><strong className="text-ink-1">Claude Projects:</strong> Settings → Project → Add MCP server → paste URL + auth header</div>
                <div><strong className="text-ink-1">GPT Actions:</strong> Configure → Authentication → Bearer Token → paste token</div>
                <div><strong className="text-ink-1">Any agent:</strong> <code className="font-mono text-indigo-700">Authorization: Bearer &lt;token&gt;</code> on each request</div>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Revoke dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={revokeTarget != null}
        onOpenChange={(o) => {
          if (!o) setRevokeTarget(null);
        }}
        title="Revoke token?"
        description="Any client using this token will be denied immediately."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onPress={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isDisabled={revoking}
              onPress={() => void handleRevoke()}
              className="flex items-center gap-1.5"
            >
              {revoking ? <Spinner size="sm" /> : <Trash2 size={14} />}
              Revoke token
            </Button>
          </>
        }
      >
        {revokeTarget && (
          <p className="t-label text-ink-2">
            Revoke <span className="font-semibold text-ink-1">{revokeTarget.name}</span>?
          </p>
        )}
      </Dialog>
    </div>
  );
}
