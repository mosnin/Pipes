"use client";

import { useEffect, useState } from "react";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";
import {
  Button,
  Card,
  Chip,
  Spinner,
  Table,
  Separator,
} from "@heroui/react";
import { Key, Copy, CheckCircle2, Trash2 } from "lucide-react";

const CAPABILITY_LABELS: Record<string, string> = {
  "systems:read": "Systems Read",
  "systems:write": "Systems Write",
  "schema:read": "Schema Read",
  "templates:read": "Templates Read",
  "templates:instantiate": "Templates Instantiate",
  "versions:read": "Versions Read",
  "versions:write": "Versions Write",
  "graph:write": "Graph Write",
  "comments:write": "Comments Write",
  "import:write": "Import Write",
  "validation:read": "Validation Read",
};

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

export default function TokensSettingsPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [name, setName] = useState("CI Bot");
  const [capabilities, setCapabilities] = useState<string[]>(["systems:read", "schema:read"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = () =>
    fetch("/api/settings/tokens")
      .then((r) => r.json())
      .then((d) => setTokens(d.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
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
        setAuthHeader(data.data.authHeaderExample);
      }
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    await fetch(`/api/settings/tokens/${tokenId}/revoke`, { method: "POST" });
    await load();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleCapability = (cap: string, checked: boolean) => {
    setCapabilities((prev) =>
      checked ? [...prev, cap] : prev.filter((x) => x !== cap)
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Key className="w-6 h-6 text-primary" />
          API Tokens
        </h1>
        <p className="mt-1 text-sm text-default-500">
          Create tokens to access the Pipes Protocol API and MCP interface
        </p>
      </div>

      {/* Create Token Section */}
      <Card className="shadow-sm border border-divider">
        <Card.Content className="p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Create new token</h2>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-default-700" htmlFor="tokenName">Token name</label>
            <input id="tokenName" type="text" placeholder="e.g. CI pipeline, Claude agent" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-default-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Capabilities */}
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-default-700">Capabilities</p>
              <p className="text-xs text-default-400 mt-0.5">
                Select the permissions this token will have. Grant only what is needed.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {AGENT_CAPABILITIES.map((cap) => (
                <label
                  key={cap}
                  className="flex items-center gap-2 cursor-pointer max-w-full"
                >
                  <input
                    type="checkbox"
                    checked={capabilities.includes(cap)}
                    onChange={(e) => toggleCapability(cap, e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-default-600">
                    <span className="font-mono text-xs">{cap}</span>
                    <span className="text-default-400 text-xs ml-1">
                      — {CAPABILITY_LABELS[cap] ?? cap}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              onPress={handleCreate}
              isDisabled={!name.trim() || capabilities.length === 0}
            >
              {creating ? <Spinner size="sm" /> : <Key className="w-4 h-4" />}
              Create token
            </Button>
          </div>

          {/* One-time secret display */}
          {secret && (
            <>
              <Separator />
              <div className="rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700 p-4 space-y-3">
                <div className="flex items-center gap-2 text-success-700 dark:text-success-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-semibold">Token created — copy it now</p>
                </div>
                <p className="text-xs text-success-600 dark:text-success-500">
                  This secret will not be shown again. Store it somewhere safe.
                </p>
                <div className="flex items-center gap-2 bg-default-900 rounded-lg px-3 py-2">
                  <code className="flex-1 text-xs text-green-400 font-mono break-all">
                    {secret}
                  </code>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="text-default-400 hover:text-default-200 shrink-0"
                    onPress={() => handleCopy(secret)}
                    aria-label="Copy token"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-success-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {authHeader && (
                  <div className="space-y-1">
                    <p className="text-xs text-success-600 dark:text-success-500 font-medium">
                      Example Authorization header:
                    </p>
                    <div className="bg-default-900 rounded-lg px-3 py-2">
                      <code className="text-xs text-blue-400 font-mono break-all">
                        {authHeader}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Active Tokens Table */}
      <Card className="shadow-sm border border-divider">
        <Card.Content className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Active tokens</h2>

          {tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="w-10 h-10 text-default-300 mb-3" />
              <p className="text-sm font-medium text-default-500">No tokens yet</p>
              <p className="text-xs text-default-400 mt-1">
                Create a token above when you&apos;re ready to connect REST or MCP clients.
              </p>
            </div>
          ) : (
            <Table
              aria-label="API tokens"
            >
              <Table.Content>
                <Table.Header>
                  <Table.Row>
                    <Table.Column>Name</Table.Column>
                    <Table.Column>Capabilities</Table.Column>
                    <Table.Column>Created</Table.Column>
                    <Table.Column>Last used</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column>Actions</Table.Column>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tokens.map((token) => (
                    <Table.Row key={token.id}>
                      <Table.Cell>
                        <span className="font-medium text-foreground">{token.name}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(token.capabilities ?? []).map((cap: string) => (
                            <Chip
                              key={cap}
                              size="sm"
                              variant="soft"
                              color="accent"
                              className="font-mono text-[10px]"
                            >
                              {cap}
                            </Chip>
                          ))}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-default-500 text-xs">{formatDate(token.createdAt)}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-default-500 text-xs">{formatDate(token.lastUsedAt)}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={token.revokedAt ? "danger" : "success"}
                        >
                          {token.revokedAt ? "Revoked" : "Active"}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        {!token.revokedAt && (
                          <Button
                            size="sm"
                            variant="danger"
                            onPress={() => handleRevoke(token.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Example Usage */}
      <Card className="shadow-sm border border-divider">
        <Card.Content className="p-6 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Example usage</h2>
          <p className="text-xs text-default-400">
            Pass your token as a Bearer token in the Authorization header of every API request.
          </p>
          <div className="rounded-xl bg-default-900 px-4 py-3">
            <code className="text-xs font-mono text-blue-300">
              Authorization: Bearer ptk_your_token_here
            </code>
          </div>
          <p className="text-xs text-default-400">
            For MCP connections, set this header in your client configuration under{" "}
            <code className="text-xs bg-default-100 px-1 py-0.5 rounded">Authorization</code>.
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
