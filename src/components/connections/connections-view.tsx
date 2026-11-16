"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { CellStack } from "@/components/data/table";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { request } from "@/components/connections/request";

type ConnectionType = "mcp" | "http" | "skill";

type Connection = {
  id: string;
  name: string;
  type: ConnectionType;
  url: string;
  description?: string;
  headerName?: string;
  hasSecret: boolean;
  secretPreview?: string;
  createdAt: string;
};

const TYPE_LABEL: Record<ConnectionType, string> = {
  mcp: "MCP server",
  http: "HTTP API",
  skill: "Skill",
};

const URL_HINT: Record<ConnectionType, string> = {
  mcp: "The server's Streamable HTTP address.",
  http: "The API's base address.",
  skill: "Where the skill lives, or its name if your agents already have it.",
};

const URL_PLACEHOLDER: Record<ConnectionType, string> = {
  mcp: "https://mcp.example.com/mcp",
  http: "https://api.example.com/v1",
  skill: "https://github.com/acme/skills/triage",
};

export function ConnectionsView(): ReactNode {
  const toast = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Connection | null>(null);

  const load = useCallback(async () => {
    const res = await request<Connection[]>("/api/connections");
    if (res.ok) {
      setConnections(res.data);
      setLoadError(null);
    } else setLoadError(res.message);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SettingsShell
      title="Connections"
      description="The MCP servers, APIs and skills your workflow steps call. A step names the connections it needs, and the agent running it receives them with the step."
      actions={
        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
          New connection
        </Button>
      }
    >
      {loadError ? (
        <Banner role="critical" title="Connections could not be loaded">
          {loadError}
        </Banner>
      ) : null}

      <div className="flex flex-col gap-3">
        {loaded && connections.length === 0 && !loadError ? (
          <Card>
            <EmptyState
              title="No connections yet"
              body="Add the MCP servers and APIs your steps use, so every agent that runs them gets the same address and credentials."
              className="py-8"
            />
          </Card>
        ) : (
          <RecordTable
            loading={!loaded}
            noun="connection"
            columns={[
              { label: "Name" },
              { label: "Type", className: "w-[120px]" },
              { label: "URL", className: "min-w-[240px]" },
              { label: "Secret", className: "w-[200px]" },
              { label: "Actions", hidden: true, className: "w-[96px]" },
            ]}
            rows={connections.map((c) => ({
              key: c.id,
              cells: [
                <CellStack
                  key="n"
                  title={c.name}
                  meta={c.description ?? c.id}
                />,
                <span key="t" className="t-body text-ink-2">
                  {TYPE_LABEL[c.type] ?? c.type}
                </span>,
                <span
                  key="u"
                  className="t-mono-hash block max-w-[360px] truncate text-ink-2"
                  title={c.url}
                >
                  {c.url}
                </span>,
                c.hasSecret ? (
                  <span key="s" className="flex flex-col gap-0.5">
                    <span className="t-mono-hash text-ink">
                      {c.secretPreview ?? "Stored"}
                    </span>
                    {c.headerName ? (
                      <span className="t-caption text-ink-3">
                        Sent as {c.headerName}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span key="s" className="t-caption text-ink-3">
                    None
                  </span>
                ),
                <Button
                  key="x"
                  variant="destructive"
                  size="sm"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => setRemoving(c)}
                >
                  Delete
                </Button>,
              ],
            }))}
            empty={null}
          />
        )}
        <p className="t-caption max-w-[90ch] text-ink-3">
          Secrets are encrypted at rest and never shown again. Agents receive
          them only with a token that holds the{" "}
          <span className="t-mono-hash text-ink-2">connections:secrets</span>{" "}
          capability.
        </p>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent size="form">
          <CreateConnectionForm
            onCreated={async (connection) => {
              setCreating(false);
              toast(`${connection.name} added`);
              await load();
            }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing ? `Delete ${removing.name}?` : "Delete connection?"}
        description="Steps that name this connection stop receiving it, and its stored secret is destroyed. Runs already in progress keep what they were given."
        confirmLabel="Delete connection"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const res = await request(
            `/api/connections?id=${encodeURIComponent(removing.id)}`,
            { method: "DELETE" },
          );
          if (!res.ok) {
            toast(res.message);
            throw new Error(res.message);
          }
          toast(`${removing.name} deleted`);
          await load();
        }}
      />
    </SettingsShell>
  );
}

/**
 * The create form lives inside the dialog's content so closing the dialog
 * unmounts it, and a half-typed secret never survives into the next attempt.
 */
function CreateConnectionForm({
  onCreated,
  onCancel,
}: {
  onCreated: (c: Connection) => void | Promise<void>;
  onCancel: () => void;
}): ReactNode {
  const id = useId();
  const [type, setType] = useState<ConnectionType>("mcp");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [headerName, setHeaderName] = useState("Authorization");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await request<Connection>("/api/connections", {
      method: "POST",
      body: {
        name,
        type,
        url,
        description: description || undefined,
        headerName: secret ? headerName : undefined,
        secret: secret || undefined,
      },
    });
    setBusy(false);
    if (res.ok) await onCreated(res.data);
    else setError(res.message);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>New connection</DialogTitle>
        <DialogDescription>
          Something a step calls while it runs.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        {error ? <Banner role="critical">{error}</Banner> : null}
        <div className="flex flex-col gap-1.5">
          <span id={`${id}-type`} className="t-caption-medium text-ink">
            Type
          </span>
          <Segmented<ConnectionType>
            label="Connection type"
            value={type}
            onValueChange={setType}
            options={[
              { value: "mcp", label: "MCP server" },
              { value: "http", label: "HTTP API" },
              { value: "skill", label: "Skill" },
            ]}
            className="self-start"
          />
        </div>
        <Field
          label="Name"
          htmlFor={`${id}-name`}
          hint="What steps and people will call it."
        >
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Linear"
            autoComplete="off"
          />
        </Field>
        <Field label="URL" htmlFor={`${id}-url`} hint={URL_HINT[type]}>
          <Input
            id={`${id}-url`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={URL_PLACEHOLDER[type]}
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field
          label="Description"
          htmlFor={`${id}-description`}
          hint="Optional. When a step should use it."
        >
          <Textarea
            id={`${id}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[72px]"
            placeholder="Create and update issues in the Support team."
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Field
            label="Header"
            htmlFor={`${id}-header`}
            hint="Where the secret is sent."
          >
            <Input
              id={`${id}-header`}
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field
            label="Secret"
            htmlFor={`${id}-secret`}
            hint="Optional. Encrypted, and never shown again."
          >
            <Input
              id={`${id}-secret`}
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="new-password"
              placeholder="API key or token"
            />
          </Field>
        </div>
      </DialogBody>
      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={busy}
          disabled={!name.trim() || !url.trim()}
        >
          Add connection
        </Button>
      </DialogFooter>
    </form>
  );
}
