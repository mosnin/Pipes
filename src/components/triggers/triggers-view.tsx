"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CellStack } from "@/components/data/table";
import { StatusPill } from "@/components/ledger/status";
import {
  SettingsSection,
  SettingsShell,
} from "@/components/settings/SettingsShell";
import { CheckRow } from "@/components/settings/check-row";
import { FactList } from "@/components/settings/fact-list";
import { RecordTable } from "@/components/settings/record-table";
import {
  CodeSnippet,
  CopyButton,
  useOrigin,
} from "@/components/connections/code-snippet";
import { request } from "@/components/connections/request";
import { readCron } from "@/components/triggers/cron-reading";
import { Toggle } from "@/components/triggers/toggle";

type Schedule = {
  id: string;
  cron: string;
  enabled: boolean;
  label?: string;
  lastFiredAt?: string;
  createdAt: string;
};

type TriggersView = {
  webhookEnabled: boolean;
  webhookKeyPreview?: string;
  schedules: Schedule[];
  outboundUrl?: string;
  outboundConfigured: boolean;
  outboundEvents: string[];
};

/** Mirrors OUTBOUND_EVENTS in the trigger service; that module is server-only. */
const EVENTS: { value: string; description: string }[] = [
  { value: "run.started", description: "A run began." },
  { value: "run.completed", description: "A run reached its end." },
  { value: "run.failed", description: "A step failed and the run stopped." },
  { value: "run.canceled", description: "Someone canceled the run." },
  {
    value: "approval.requested",
    description: "A run is waiting for a person to approve a step.",
  },
];

export function TriggersView({ systemId }: { systemId: string }): ReactNode {
  const origin = useOrigin();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<TriggersView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await request<TriggersView>(
      `/api/systems/${systemId}/triggers`,
    );
    if (res.ok) setTriggers(res.data);
    else setLoadError(res.message);
  }, [systemId]);

  useEffect(() => {
    void load();
    void request<{ system?: { name?: string } }>(
      `/api/systems/${systemId}`,
    ).then((res) => {
      if (res.ok) setName(res.data.system?.name ?? null);
    });
  }, [load, systemId]);

  const act = useCallback(
    async <T,>(body: Record<string, unknown>) => {
      const res = await request<T & { triggers?: TriggersView }>(
        `/api/systems/${systemId}/triggers`,
        { method: "POST", body },
      );
      if (res.ok && res.data.triggers) setTriggers(res.data.triggers);
      return res;
    },
    [systemId],
  );

  const editorLink = (
    <Link href={`/systems/${systemId}`} className="t-link text-ink">
      {name ?? "this workflow"}
    </Link>
  );

  return (
    <SettingsShell
      title="Triggers"
      description={
        <>
          How runs of {editorLink} start without a person or an agent starting
          them, and where Pipes reports what they did.
        </>
      }
      actions={
        <Button asChild variant="secondary" size="sm">
          <Link href={`/systems/${systemId}`}>Open editor</Link>
        </Button>
      }
    >
      {loadError ? (
        <Banner role="critical" title="Triggers could not be loaded">
          {loadError}
        </Banner>
      ) : null}

      <WebhookSection
        systemId={systemId}
        origin={origin}
        triggers={triggers}
        act={act}
        toast={toast}
      />
      <SchedulesSection triggers={triggers} act={act} toast={toast} />
      <OutboundSection triggers={triggers} act={act} toast={toast} />
    </SettingsShell>
  );
}

type Act = <T>(
  body: Record<string, unknown>,
) => Promise<
  | { ok: true; data: T & { triggers?: TriggersView } }
  | { ok: false; error: string; message: string }
>;

function LoadingCard(): ReactNode {
  return (
    <Card>
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-[14px] w-[240px]" />
        <Skeleton className="h-[14px] w-[200px]" />
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function WebhookSection({
  systemId,
  origin,
  triggers,
  act,
  toast,
}: {
  systemId: string;
  origin: string;
  triggers: TriggersView | null;
  act: Act;
  toast: (message: string) => void;
}): ReactNode {
  const [key, setKey] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `${origin}/api/hooks/${systemId}`;
  const hasKey = Boolean(triggers?.webhookKeyPreview);

  const rotate = async () => {
    setBusy(true);
    const res = await act<{ key: string }>({ action: "rotate_webhook" });
    setBusy(false);
    if (res.ok) {
      setKey(res.data.key);
      setError(null);
    } else {
      setError(res.message);
      throw new Error(res.message);
    }
  };

  const setEnabled = async (enabled: boolean) => {
    const res = await act({ action: "set_webhook", enabled });
    if (res.ok) toast(enabled ? "Webhook turned on" : "Webhook turned off");
    else setError(res.message);
  };

  const curl = [
    `curl -X POST ${endpoint} \\`,
    `  -H "content-type: application/json" \\`,
    `  -H "x-pipes-key: ${key ?? "<your webhook key>"}" \\`,
    `  -d '{"ticket": "SUP-1042", "priority": "high"}'`,
  ].join("\n");

  return (
    <SettingsSection
      title="Webhook"
      description="Another system starts a run by posting to this workflow's address with its key. The JSON body becomes the run's input."
    >
      {!triggers ? (
        <LoadingCard />
      ) : (
        <div className="flex flex-col gap-3">
          {key ? (
            <Banner role="caution" title="Copy this key now. It is shown once.">
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="t-mono-hash min-w-0 break-all text-ink">
                  {key}
                </code>
                <CopyButton text={key} />
              </div>
            </Banner>
          ) : null}
          {error ? <Banner role="critical">{error}</Banner> : null}

          <Card>
            <FactList
              facts={[
                {
                  label: "Accepting calls",
                  value: (
                    <span className="inline-flex items-center gap-2">
                      <span className="t-body text-ink-2">
                        {triggers.webhookEnabled
                          ? "On"
                          : hasKey
                            ? "Off"
                            : "Generate a key first"}
                      </span>
                      <Toggle
                        label="Accept webhook calls"
                        checked={triggers.webhookEnabled}
                        disabled={!hasKey}
                        onCheckedChange={setEnabled}
                      />
                    </span>
                  ),
                },
                {
                  label: "Address",
                  value: (
                    <span className="t-mono-hash break-all text-ink">
                      {endpoint || `/api/hooks/${systemId}`}
                    </span>
                  ),
                },
                {
                  label: "Key",
                  value: hasKey ? (
                    <span className="t-mono-hash text-ink">
                      {triggers.webhookKeyPreview}
                    </span>
                  ) : (
                    <span className="text-ink-3">None yet</span>
                  ),
                },
              ]}
            />
            <CardFooter inset>
              <span className="t-caption text-ink-3">
                Send the key in the x-pipes-key header. Pipes stores only its
                hash.
              </span>
              <Button
                variant={hasKey ? "secondary" : "primary"}
                size="sm"
                loading={busy}
                onClick={() =>
                  hasKey
                    ? setConfirmRotate(true)
                    : void rotate().catch(() => undefined)
                }
              >
                {hasKey ? "Rotate key" : "Generate key"}
              </Button>
            </CardFooter>
          </Card>

          <CodeSnippet
            label={
              key
                ? "Try it"
                : "Try it, with your key in place of the placeholder"
            }
            code={curl}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmRotate}
        onOpenChange={setConfirmRotate}
        title="Rotate the webhook key?"
        description="The current key stops working at once. Anything still sending it gets a 401 until you give it the new key."
        confirmLabel="Rotate key"
        destructive
        onConfirm={rotate}
      />
    </SettingsSection>
  );
}

/* -------------------------------------------------------------------------- */

function SchedulesSection({
  triggers,
  act,
  toast,
}: {
  triggers: TriggersView | null;
  act: Act;
  toast: (message: string) => void;
}): ReactNode {
  const id = useId();
  const [cron, setCron] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Schedule | null>(null);
  const reading = cron.trim() ? readCron(cron) : null;

  const add = async () => {
    setBusy(true);
    const res = await act({
      action: "add_schedule",
      cron: cron.trim(),
      label: label.trim() || undefined,
    });
    setBusy(false);
    if (res.ok) {
      setCron("");
      setLabel("");
      setError(null);
      toast("Schedule added");
    } else {
      setError(res.message);
    }
  };

  const schedules = triggers?.schedules ?? [];

  return (
    <SettingsSection
      title="Schedules"
      description={
        <>
          Start a run on a timetable, written as a five-field cron expression in
          UTC. Pipes checks schedules when an operator calls{" "}
          <code className="t-mono-hash text-ink-2">
            GET /api/cron/schedules
          </code>{" "}
          with the <code className="t-mono-hash text-ink-2">CRON_SECRET</code>{" "}
          bearer token, so set that up to run every minute or every few.
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
              <Field
                label="Cron expression"
                htmlFor={`${id}-cron`}
                error={error ?? undefined}
                hint={
                  reading ??
                  "minute hour day month weekday, for example 0 9 * * 1-5"
                }
              >
                <Input
                  id={`${id}-cron`}
                  value={cron}
                  onChange={(e) => {
                    setCron(e.target.value);
                    setError(null);
                  }}
                  placeholder="0 9 * * 1-5"
                  invalid={Boolean(error)}
                  aria-describedby={`${id}-cron-message`}
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="Label"
                htmlFor={`${id}-label`}
                hint="Optional. Says what the run is for."
              >
                <Input
                  id={`${id}-label`}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Weekday triage"
                />
              </Field>
            </div>
            <CardFooter inset>
              <span className="t-caption tabular text-ink-3">
                {schedules.length} of 10 schedules
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={busy}
                disabled={!cron.trim()}
              >
                Add schedule
              </Button>
            </CardFooter>
          </form>
        </Card>

        {triggers && schedules.length === 0 ? (
          <Card>
            <EmptyState
              title="No schedules yet"
              body="Add one above to start runs on a timetable."
              className="py-8"
            />
          </Card>
        ) : (
          <RecordTable
            loading={!triggers}
            noun="schedule"
            columns={[
              { label: "Schedule" },
              { label: "Runs" },
              { label: "On", className: "w-[72px]" },
              { label: "Actions", hidden: true, className: "w-[96px]" },
            ]}
            rows={schedules.map((s) => ({
              key: s.id,
              cells: [
                s.label ? (
                  <CellStack
                    key="n"
                    title={s.label}
                    meta={<span className="t-mono-hash">{s.cron}</span>}
                  />
                ) : (
                  <span key="n" className="t-mono-hash text-ink">
                    {s.cron}
                  </span>
                ),
                <span key="r" className="t-body text-ink-2">
                  {readCron(s.cron) ?? "Custom schedule"}
                </span>,
                <Toggle
                  key="e"
                  label={`Run ${s.label ?? s.cron}`}
                  checked={s.enabled}
                  onCheckedChange={async (enabled) => {
                    const res = await act({
                      action: "update_schedule",
                      scheduleId: s.id,
                      enabled,
                    });
                    if (res.ok)
                      toast(enabled ? "Schedule turned on" : "Schedule paused");
                  }}
                />,
                <Button
                  key="x"
                  variant="destructive"
                  size="sm"
                  aria-label={`Remove ${s.label ?? s.cron}`}
                  onClick={() => setRemoving(s)}
                >
                  Remove
                </Button>,
              ],
            }))}
            empty={null}
          />
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this schedule?"
        description={
          removing
            ? `Runs stop starting on ${removing.cron}. Runs it already started keep going.`
            : undefined
        }
        confirmLabel="Remove schedule"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const res = await act({
            action: "remove_schedule",
            scheduleId: removing.id,
          });
          if (!res.ok) throw new Error(res.message);
          toast("Schedule removed");
        }}
      />
    </SettingsSection>
  );
}

/* -------------------------------------------------------------------------- */

function OutboundSection({
  triggers,
  act,
  toast,
}: {
  triggers: TriggersView | null;
  act: Act;
  toast: (message: string) => void;
}): ReactNode {
  const id = useId();
  const [url, setUrl] = useState<string | null>(null);
  const [events, setEvents] = useState<string[] | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // The form starts from what is saved, and stays the user's once they touch it.
  const urlValue = url ?? triggers?.outboundUrl ?? "";
  const eventValue =
    events ?? triggers?.outboundEvents ?? EVENTS.map((e) => e.value);

  const save = async () => {
    setBusy(true);
    const res = await act<{ secret?: string }>({
      action: "set_outbound",
      url: urlValue.trim(),
      events: eventValue,
    });
    setBusy(false);
    if (res.ok) {
      setError(null);
      setUrl(null);
      setEvents(null);
      if (res.data.secret) setSecret(res.data.secret);
      toast("Outbound events saved");
    } else {
      setError(res.message);
    }
  };

  const verify = [
    `import crypto from "node:crypto";`,
    ``,
    `// rawBody is the request body exactly as received, before JSON parsing.`,
    `const timestamp = req.headers["x-pipes-timestamp"];`,
    `const expected = "sha256=" + crypto`,
    `  .createHmac("sha256", process.env.PIPES_SIGNING_SECRET)`,
    `  .update(timestamp + "." + rawBody)`,
    `  .digest("hex");`,
    ``,
    `const received = req.headers["x-pipes-signature"];`,
    `const valid = received.length === expected.length &&`,
    `  crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));`,
  ].join("\n");

  return (
    <SettingsSection
      title="Outbound events"
      description="Pipes posts a JSON event to your endpoint when a run of this workflow changes state. Each request is signed, so your endpoint can check it came from Pipes."
      action={
        triggers ? (
          <StatusPill
            role={triggers.outboundConfigured ? "positive" : "neutral"}
          >
            {triggers.outboundConfigured ? "Sending" : "Not set up"}
          </StatusPill>
        ) : null
      }
    >
      {!triggers ? (
        <LoadingCard />
      ) : (
        <div className="flex flex-col gap-3">
          {secret ? (
            <Banner
              role="caution"
              title="Copy this signing secret now. It is shown once."
            >
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="t-mono-hash min-w-0 break-all text-ink">
                  {secret}
                </code>
                <CopyButton text={secret} />
              </div>
            </Banner>
          ) : null}

          <Card>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="flex flex-col gap-5 p-4">
                <Field
                  label="Endpoint URL"
                  htmlFor={`${id}-url`}
                  error={error ?? undefined}
                  hint="A public https address that accepts POST requests."
                  className="max-w-[560px]"
                >
                  <Input
                    id={`${id}-url`}
                    type="url"
                    value={urlValue}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://example.com/hooks/pipes"
                    invalid={Boolean(error)}
                    aria-describedby={`${id}-url-message`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="t-caption-medium mb-1.5 text-ink">
                    Events
                  </legend>
                  <div className="-mx-2 grid grid-cols-1 gap-0.5 md:grid-cols-2">
                    {EVENTS.map((event) => (
                      <CheckRow
                        key={event.value}
                        mono
                        label={event.value}
                        description={event.description}
                        checked={eventValue.includes(event.value)}
                        onToggle={() =>
                          setEvents(
                            eventValue.includes(event.value)
                              ? eventValue.filter((x) => x !== event.value)
                              : [...eventValue, event.value],
                          )
                        }
                      />
                    ))}
                  </div>
                </fieldset>
              </div>
              <CardFooter inset>
                <span className="t-caption tabular text-ink-3">
                  {eventValue.length} of {EVENTS.length} events
                </span>
                <div className="flex items-center gap-1">
                  {triggers.outboundConfigured ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmClear(true)}
                    >
                      Stop sending
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={busy}
                    disabled={!urlValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>

          <div className="flex flex-col gap-2">
            <p className="t-body max-w-[90ch] text-ink-2">
              Every request carries{" "}
              <code className="t-mono-hash text-ink">x-pipes-timestamp</code>{" "}
              and{" "}
              <code className="t-mono-hash text-ink">x-pipes-signature</code>.
              The signature is an HMAC-SHA256 of the timestamp, a full stop and
              the raw body, keyed with your signing secret. Reject a request
              whose signature does not match, or whose timestamp is more than a
              few minutes old.
            </p>
            <CodeSnippet label="Verify a delivery in Node.js" code={verify} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Stop sending events?"
        description="Pipes forgets the endpoint and its signing secret. Saving an endpoint again issues a new secret."
        confirmLabel="Stop sending"
        destructive
        onConfirm={async () => {
          const res = await act({ action: "set_outbound", url: "" });
          if (!res.ok) throw new Error(res.message);
          setUrl(null);
          setSecret(null);
          toast("Outbound events stopped");
        }}
      />
    </SettingsSection>
  );
}
