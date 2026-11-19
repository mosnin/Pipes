"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { RelativeTime } from "@/components/ledger/relative-time";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { apiErrorMessage } from "@/components/shell/api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { MemoryFact } from "@/domain/memory/service";

type Data = { facts: Fact[]; history: Fact[]; canEdit: boolean };
type Scope = "workflow" | "team" | "private";
type Fact = MemoryFact & { scope?: Scope };

const SCOPE_PILL: Record<Scope, string | null> = { workflow: null, team: "Whole team", private: "Only you" };

const at = (iso?: string) => (iso ? new Date(iso).getTime() : Date.now());

/** Where a fact came from, in words: who taught it, on which step, and the run. */
function Source({ fact }: { fact: MemoryFact }): ReactNode {
  const s = fact.source;
  const who = s.label ?? (s.type === "agent" ? "An agent" : s.type === "person" ? "A person" : "A run");
  return (
    <span className="t-caption text-ink-3">
      {who}
      {s.stepTitle ? `, on ${s.stepTitle}` : ""}
      {fact.key ? <span className="t-mono-hash">{` · ${fact.key}`}</span> : null}
      {s.runId ? (
        <>
          {" · "}
          <Link href={`/runs/${s.runId}`} className="t-link">
            Open run
          </Link>
        </>
      ) : null}
    </span>
  );
}

/**
 * A workflow's memory: facts learned on earlier runs, given to the next
 * performer of a matching step. Facts are never erased; replaced and forgotten
 * ones stay in the history.
 */
export function WorkflowMemoryView({ systemId }: { systemId: string }): ReactNode {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [scope, setScope] = useState<Scope>("workflow");
  const [eraseOpen, setEraseOpen] = useState(false);
  // People who cannot edit shared memory can still keep private notes.
  const chosen: Scope = data && !data.canEdit ? "private" : scope;
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      const json = await fetch(`/api/systems/${systemId}/memory${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (json?.ok) setData(json.data);
    },
    [systemId]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(query), query ? 200 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const remember = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy("new");
    const json = await fetch(`/api/systems/${systemId}/memory`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, key: key || undefined, scope: chosen }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(null);
    if (!json?.ok) return toast(apiErrorMessage(json, "That fact was not saved."), { tone: "error" });
    toast(json.data.duplicate ? "Already remembered." : json.data.replaced ? "Remembered. It replaces the older fact with that key." : "Remembered. Matching steps will see it.");
    setText("");
    setKey("");
    void load(query);
  };

  const erase = async () => {
    const json = await fetch("/api/account/memory", { method: "DELETE" })
      .then((r) => r.json())
      .catch(() => null);
    if (!json?.ok) return toast(apiErrorMessage(json, "Your private memories were not erased."), { tone: "error" });
    toast(`Erased ${json.data.erased} private ${json.data.erased === 1 ? "memory" : "memories"}.`);
    void load(query);
  };

  const forget = async (fact: MemoryFact) => {
    setBusy(fact.id);
    const json = await fetch(`/api/systems/${systemId}/memory?factId=${encodeURIComponent(fact.id)}&reason=${encodeURIComponent("Forgotten from the memory page.")}`, { method: "DELETE" })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(null);
    if (!json?.ok) return toast(apiErrorMessage(json, "That fact was not forgotten."), { tone: "error" });
    toast("Forgotten. It stays in the history below.");
    void load(query);
  };

  return (
    <SettingsShell
      title="Memory"
      description="Facts learned on earlier runs: this workflow's, the whole team's, and your own private ones. Each step is given the facts that match it, so the next agent or person starts with what the last one found out."
      measure="prose"
    >
      {data ? (
        <SettingsSection title="Teach it something" description="One fact per entry, true beyond a single run. Give related facts the same key and a newer one replaces the older one.">
          <Card>
            <form onSubmit={remember}>
              <CardContent className="flex flex-col gap-4">
                <Field label="Fact" htmlFor="mem-text" hint="For example: Acme wants invoices in euros, never dollars.">
                  <Input id="mem-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
                </Field>
                <Field label="Key" htmlFor="mem-key" hint="Optional. A short name for what the fact is about, such as acme-invoice-currency.">
                  <Input id="mem-key" value={key} onChange={(e) => setKey(e.target.value)} className="t-mono-hash" />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="t-caption-medium text-ink">Applies to</span>
                  <Segmented<Scope>
                    label="Applies to"
                    value={chosen}
                    onValueChange={setScope}
                    options={[
                      ...(data.canEdit
                        ? [
                            { value: "workflow" as const, label: "This workflow" },
                            { value: "team" as const, label: "Whole team" }
                          ]
                        : []),
                      { value: "private" as const, label: "Only me" }
                    ]}
                    className="self-start"
                  />
                  <span className="t-caption text-ink-3">
                    {chosen === "private"
                      ? "Only you, and agents you allow with memory:private, will ever see it. Nobody else in the workspace can, whatever their role."
                      : chosen === "team"
                        ? "Everyone in the workspace, and every workflow's performers."
                        : "Performers of this workflow, at the steps it matches."}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" variant="primary" size="sm" disabled={!text.trim() || busy === "new"} loading={busy === "new"}>
                  Remember
                </Button>
              </CardFooter>
            </form>
          </Card>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="What it knows"
        action={<Input aria-label="Search memory" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-8 w-[180px]" />}
      >
        <RecordTable
          loading={!data}
          noun="fact"
          columns={[{ label: "Fact" }, { label: "Learned", className: "w-[110px]" }, { label: "Actions", hidden: true, className: "w-[90px]" }]}
          rows={(data?.facts ?? []).map((f) => ({
            key: f.id,
            cells: [
              <span key="f" className="flex min-w-0 flex-col gap-0.5">
                <span className="text-ink">
                  {f.text} {f.scope && SCOPE_PILL[f.scope] ? <StatusPill role={f.scope === "private" ? "info" : "neutral"}>{SCOPE_PILL[f.scope]}</StatusPill> : null}
                </span>
                <Source fact={f} />
              </span>,
              <RelativeTime key="t" at={at(f.validAt)} />,
              data?.canEdit || f.scope === "private" ? (
                <Button key="x" variant="ghost" size="sm" disabled={busy === f.id} onClick={() => void forget(f)}>
                  Forget
                </Button>
              ) : (
                <span key="x" />
              )
            ]
          }))}
          empty={
            query ? (
              <EmptyState art="search" title="Nothing matches" body="Try other words, or clear the search to see every fact." className="py-8" />
            ) : (
              <EmptyState art="activity" title="Nothing remembered yet" body="Agents add facts when they complete a step with remember, or with the remember tool. You can teach it here too." className="py-8" />
            )
          }
        />
      </SettingsSection>

      {data && data.history.length ? (
        <SettingsSection title="History" description="Facts that were replaced or forgotten. Kept so you can see what the workflow used to believe, and when that changed.">
          <RecordTable
            noun="fact"
            columns={[{ label: "Fact" }, { label: "Why it stopped", className: "w-[200px]" }, { label: "When", className: "w-[110px]" }]}
            rows={data.history.map((f) => ({
              key: f.id,
              cells: [
                <span key="f" className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-ink-2">{f.text}</span>
                  <Source fact={f} />
                </span>,
                <span key="r" className="text-ink-3">
                  {f.invalidReason}
                </span>,
                <RelativeTime key="t" at={at(f.invalidAt)} />
              ]
            }))}
            empty={null}
          />
        </SettingsSection>
      ) : null}
      <SettingsSection title="Your private memory" description="Facts you saved for yourself in this workspace. Nobody else can see them, and erasing them is permanent, history included.">
        <Card>
          <CardFooter className="border-t-0">
            <span className="t-body text-ink-2">Erase every private memory you have in this workspace.</span>
            <Button variant="destructive" size="sm" onClick={() => setEraseOpen(true)}>
              Erase
            </Button>
          </CardFooter>
        </Card>
      </SettingsSection>

      <ConfirmDialog
        open={eraseOpen}
        onOpenChange={setEraseOpen}
        title="Erase your private memories?"
        description="Every fact you saved for yourself in this workspace is deleted for good, with its history. Team and workflow memories are not touched."
        confirmLabel="Erase"
        destructive
        confirmPhrase="ERASE"
        onConfirm={erase}
      />
    </SettingsShell>
  );
}
