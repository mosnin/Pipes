"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import useSWR from "swr";
import { PageShell, SplitLayout } from "@/components/layouts/archetypes";
import { RelativeTime } from "@/components/ledger/relative-time";
import { StatusPill } from "@/components/ledger/status";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Textarea } from "@/components/ui/input";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FactList } from "@/components/settings/fact-list";
import type { Actor, CurrentStep, NextOption, StepRecord, WorkflowRun } from "@/domain/runs/types";
import type { ConnectionView } from "@/domain/connections/service";
import { useNow } from "@/lib/now";
import type { ApiError } from "@/lib/swr";
import { RunStatusPill } from "@/components/runs/run-status-pill";
import {
  actorKind,
  actorName,
  callApi,
  formatClock,
  formatDuration,
  formatOutput,
  formatStamp,
  isActive,
  nodeTypeLabel,
  outcomeView,
  parseOutput,
  ROUTE_LABEL,
  runDuration,
  sameDay,
  TRIGGER_LABEL,
  ts
} from "@/components/runs/run-format";
import { HoldConfirm } from "@/components/micro/hold-confirm";
import { MorphArrow } from "@/components/micro/morph-arrow";
import { Avatar } from "@/components/ledger/author-stamp";
import { RunJournal } from "@/components/runs/run-journal";
import { DecisionNotes, RouteSuggestion, TriageSuggestion } from "@/components/decisions/decision-ui";

type Current = CurrentStep & { connections: ConnectionView[] };
type Detail = { run: WorkflowRun; current: Current };

/** While a run can still move, re-read it this often so an agent's progress shows without a reload. */
const POLL_MS = 3000;

export function RunDetailClient({ runId }: { runId: string }): ReactNode {
  const { data: detail, error, mutate } = useSWR<Detail, ApiError>(`/api/runs/${runId}`, {
    // While a run can still move, keep reading it; a finished run stops polling.
    refreshInterval: (latest) => (latest && isActive(latest.run.status) ? POLL_MS : 0)
  });
  const loadError = error ? { code: error.code, message: error.message } : null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Every action posts, then re-reads the run, so the page always shows what the server decided. */
  const act = async (path: string, body: unknown): Promise<boolean> => {
    setBusy(true);
    setActionError(null);
    const result = await callApi<unknown>(`/api/runs/${runId}/${path}`, { method: "POST", body });
    if (!result.ok) setActionError(result.message);
    await mutate();
    setBusy(false);
    return result.ok;
  };

  if (!detail) {
    if (loadError) {
      return (
        <PageShell measure="page">
          <div className="flex min-h-[60vh] items-center justify-center">
            <EmptyState
              variant={loadError.code === "run_not_found" ? "never" : "error"}
              titleAs="h1"
              title={loadError.code === "run_not_found" ? "This run does not exist" : "This run could not be loaded"}
              body={loadError.code === "run_not_found" ? "It may belong to another workspace, or the link is mistyped." : loadError.message}
              action={
                <Button asChild variant="secondary" size="md">
                  <Link href="/runs">All runs</Link>
                </Button>
              }
            />
          </div>
        </PageShell>
      );
    }
    return (
      <PageShell measure="page">
        <div className="flex flex-col gap-4 pt-1">
          <Skeleton className="h-[28px] w-[40%]" />
          <Skeleton className="h-[14px] w-[60%]" />
          <Skeleton className="mt-4 h-[320px] w-full rounded-12" />
        </div>
      </PageShell>
    );
  }

  const { run, current } = detail;
  const record = run.steps[run.steps.length - 1];
  const stepKey = `${run.currentNodeId ?? "none"}-${run.steps.length}`;

  return (
    <PageShell measure="page">
      <RunHeader run={run} busy={busy} onCancel={async () => { await act("cancel", { reason: "Canceled from the run page." }); }} />

      <div className="flex flex-col gap-3">
        {actionError ? (
          <Banner role="critical" title="That did not go through">
            {actionError}
          </Banner>
        ) : null}
        {loadError ? (
          <Banner role="caution" title="Live updates paused">
            {loadError.message} Pipes will keep trying.
          </Banner>
        ) : null}
        {run.status === "failed" && run.error ? <Banner role="critical" title="This run failed">{run.error}</Banner> : null}
        {run.status === "canceled" ? <Banner role="neutral" title="This run was canceled">{run.error ?? "Someone stopped it before the last step."}</Banner> : null}
      </div>

      <SplitLayout
        className={actionError || loadError || run.status === "failed" || run.status === "canceled" ? "mt-5" : undefined}
        main={
          <div className="flex flex-col gap-8">
            {run.status === "running" && current.step ? (
              <CurrentStepPanel key={stepKey} run={run} current={current} busy={busy} onComplete={(body) => act("complete", body)} />
            ) : null}
            {run.status === "waiting_approval" && current.step ? (
              <ApprovalPanel key={stepKey} run={run} current={current} record={record} busy={busy} onDecide={(body) => act("decide", body)} />
            ) : null}
            <Timeline run={run} />
            <RunJournal runId={run.id} rev={run.rev} />
          </div>
        }
        rail={<RunFacts run={run} />}
      />

    </PageShell>
  );
}

function RunHeader({ run, busy, onCancel }: { run: WorkflowRun; busy: boolean; onCancel: () => Promise<void> }): ReactNode {
  const now = useNow();
  const duration = formatDuration(runDuration(run, now));
  const live = isActive(run.status);
  return (
    <PageHeader
      kicker="Run"
      title={
        <Link href={`/systems/${run.systemId}`} className="rounded-4 hover:underline hover:decoration-1 hover:underline-offset-4 focus-ring">
          {run.systemName}
        </Link>
      }
      description={<span className="t-mono-hash text-ink-3">{run.id}</span>}
      actions={
        <>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/systems/${run.systemId}/runs`} className="group/arrow">
              Run history
              <MorphArrow />
            </Link>
          </Button>
          {live ? (
            <HoldConfirm
              label="Cancel run"
              confirmedLabel="Canceled"
              question="The run stops at its current step. Steps already done stay on the record, and nobody can complete the rest."
              onConfirm={onCancel}
              className={busy ? "pointer-events-none opacity-45" : undefined}
            />
          ) : null}
        </>
      }
      meta={
        <>
          <RunStatusPill status={run.status} />
          <MetaItem label="Trigger" value={TRIGGER_LABEL[run.trigger] ?? run.trigger} />
          <MetaItem label="Started by" value={actorName(run.startedBy)} />
          <MetaItem label="Version" value={run.versionName ?? "Unversioned draft"} />
          <MetaItem label={live ? "Running for" : "Took"} value={duration ?? "Not recorded"} />
        </>
      }
    />
  );
}

function MetaItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink tabular">{value}</span>
    </span>
  );
}

function RunFacts({ run }: { run: WorkflowRun }): ReactNode {
  const input = formatOutput(run.input);
  const done = run.steps.filter((s) => s.completedAt).length;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="run-details-heading">
        <SectionHeading>
          <span id="run-details-heading">Details</span>
        </SectionHeading>
        <Card>
          <FactList
            facts={[
              { label: "Started", value: <span className="tabular">{formatStamp(run.startedAt)}</span> },
              { label: "Ended", value: run.endedAt ? <span className="tabular">{formatStamp(run.endedAt)}</span> : <span className="text-ink-3">Still open</span> },
              { label: "Steps done", value: <span className="tabular">{done}</span> },
              ...(run.costMicros ? [{ label: "Reported spend", value: <span className="tabular">{`$${(run.costMicros / 1_000_000).toFixed(4)}`}</span> }] : []),
              ...(run.deadlineAt && !run.endedAt ? [{ label: "Deadline", value: <span className="tabular">{formatStamp(run.deadlineAt)}</span> }] : []),
              { label: "Started by", value: run.startedBy.type === "user" ? actorName(run.startedBy) : `${actorName(run.startedBy)} (${actorKind(run.startedBy).toLowerCase()})` },
              {
                label: "Workflow",
                value: (
                  <Link href={`/systems/${run.systemId}`} className="t-link">
                    {run.systemName}
                  </Link>
                )
              }
            ]}
          />
        </Card>
      </section>
      <section aria-labelledby="run-input-heading">
        <SectionHeading>
          <span id="run-input-heading">Input</span>
        </SectionHeading>
        {input ? <MonoWell text={input} /> : <p className="t-caption text-ink-3">This run started without input.</p>}
      </section>
    </div>
  );
}

function MonoWell({ text, className }: { text: string; className?: string }): ReactNode {
  return (
    <pre className={`t-mono-code max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-8 bg-inset px-3 py-2 text-ink-2 ${className ?? ""}`}>
      {text}
    </pre>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <p className="t-caption-strong text-ink-2">{label}</p>
      {children}
    </div>
  );
}

function StepBrief({ current }: { current: Current }): ReactNode {
  const step = current.step;
  if (!step) return null;
  const hasBrief = Boolean(step.description || step.instructions || step.doneWhen || step.exitCondition || step.skills.length || current.connections.length);
  if (!hasBrief) {
    return <p className="t-body text-ink-3">This step has no instructions yet. Add them in the workflow editor so the next person or agent knows what to do.</p>;
  }
  return (
    <>
      {step.description ? <p className="t-body-read text-ink-2">{step.description}</p> : null}
      {step.instructions ? (
        <Block label="Instructions">
          <p className="t-body-read whitespace-pre-wrap text-ink">{step.instructions}</p>
        </Block>
      ) : null}
      {step.doneWhen ? (
        <Block label="Done when">
          <p className="t-body-read whitespace-pre-wrap text-ink">{step.doneWhen}</p>
        </Block>
      ) : null}
      {step.exitCondition ? (
        <Block label="Stop looping when">
          <p className="t-body-read whitespace-pre-wrap text-ink">{step.exitCondition}</p>
        </Block>
      ) : null}
      {step.skills.length ? (
        <Block label="Skills">
          <ul className="flex flex-wrap gap-1">
            {step.skills.map((skill) => (
              <li key={skill} className="t-mono-micro inline-flex h-[20px] max-w-full items-center truncate rounded-6 bg-inset px-1.5 text-ink-2">
                {skill}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
      {current.connections.length ? (
        <Block label="Connections">
          <ul className="flex flex-col divide-y divide-hairline rounded-8 border border-hairline">
            {current.connections.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="t-body-strong text-ink">
                  {c.name} <span className="t-caption text-ink-3">{c.type.toUpperCase() === "MCP" ? "MCP" : nodeTypeLabel(c.type)}</span>
                </span>
                <span className="t-mono-hash min-w-0 truncate text-ink-3">{c.url}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </>
  );
}

function stepSubtitle(current: Current): string {
  const step = current.step;
  if (!step) return "";
  const parts = [nodeTypeLabel(step.type)];
  if (step.maxIterations) parts.push(`Pass ${step.iteration} of ${step.maxIterations}`);
  else if (step.iteration > 1) parts.push(`Pass ${step.iteration}`);
  return parts.join(" · ");
}

function optionLabel(option: NextOption): string {
  return option.label ?? ROUTE_LABEL[option.routeKind] ?? "Continue";
}

function CurrentStepPanel({
  run,
  current,
  busy,
  onComplete
}: {
  run: WorkflowRun;
  current: Current;
  busy: boolean;
  onComplete: (body: { nodeId: string; outcome: string; output?: unknown; notes?: string; next?: string }) => Promise<boolean>;
}): ReactNode {
  const id = useId();
  const [output, setOutput] = useState("");
  const [notes, setNotes] = useState("");
  const step = current.step;
  if (!step) return null;
  const options = current.options;
  const suggested = current.suggestion ? options.find((o) => o.pipeId === current.suggestion?.pipeId) : undefined;
  const record = run.steps[run.steps.length - 1];

  const submit = (outcome: string, next?: string) =>
    void onComplete({ nodeId: step.nodeId, outcome, output: parseOutput(output), notes: notes.trim() || undefined, next });

  return (
    <section aria-labelledby={`${id}-heading`}>
      <SectionHeading>
        <span id={`${id}-heading`}>Current step</span>
      </SectionHeading>
      <Card>
        <CardSection>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="t-title-2 text-ink">{step.title}</h2>
              <p className="t-caption text-ink-3">{stepSubtitle(current)}</p>
            </div>
            {record ? (
              <span className="t-caption shrink-0 text-ink-3">
                Open since <RelativeTime at={ts(record.startedAt)} />
              </span>
            ) : null}
          </div>
          <StepBrief current={current} />
        </CardSection>
        <CardSection>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (options.length <= 1) submit("success");
            }}
          >
            <p className="t-caption text-ink-2">
              Do the work, record what came of it, then close the step. An agent walking this workflow fills in the same two fields.
            </p>
            <Field label="Output" htmlFor={`${id}-output`} hint="Plain text, or JSON. JSON is stored as structured data the next step can read.">
              <Textarea id={`${id}-output`} rows={6} className="t-mono-code" value={output} onChange={(e) => setOutput(e.target.value)} placeholder='{ "summary": "..." }' />
            </Field>
            <Field label="Notes" htmlFor={`${id}-notes`} hint="Anything the next person should know. Optional.">
              <Textarea id={`${id}-notes`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              {options.length <= 1 ? (
                <div className="flex flex-col gap-1">
                  <Button type="submit" variant="primary" size="md" disabled={busy} loading={busy}>
                    {options.length === 0 ? "Complete and finish run" : "Complete step"}
                  </Button>
                  <p className="t-caption text-ink-3">{options.length === 0 ? "This is the last step." : `Next: ${options[0].toNodeTitle}`}</p>
                </div>
              ) : (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="t-caption-strong text-ink-2">Choose where the run goes next</p>
                  {suggested ? <RouteSuggestion suggestion={current.suggestion!} /> : null}
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((option, index) => (
                      <Button
                        key={option.pipeId}
                        type="button"
                        variant={(suggested ? option.pipeId === suggested.pipeId : index === 0) ? "primary" : "secondary"}
                        size="md"
                        disabled={busy}
                        className="max-w-full"
                        onClick={() => submit(option.label ?? (option.routeKind === "failure" ? "failure" : "success"), option.pipeId)}
                      >
                        <span className="truncate">
                          {optionLabel(option)}: {option.toNodeTitle}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button type="button" variant="destructive" size="md" disabled={busy} onClick={() => submit("failure")} className="self-start">
                Mark failed
              </Button>
            </div>
          </form>
        </CardSection>
      </Card>
    </section>
  );
}

function ApprovalPanel({
  run,
  current,
  record,
  busy,
  onDecide
}: {
  run: WorkflowRun;
  current: Current;
  record: StepRecord | undefined;
  busy: boolean;
  onDecide: (body: { decision: "approved" | "rejected" | "sent_back"; comment?: string; sendBackTo?: string }) => Promise<boolean>;
}): ReactNode {
  const id = useId();
  const [comment, setComment] = useState("");
  const [sendBackTo, setSendBackTo] = useState("");
  const step = current.step;
  if (!step) return null;
  const approverRole = run.currentNodeId ? run.snapshot.steps[run.currentNodeId]?.approverRole ?? "Editor" : "Editor";

  // Earlier steps of this run, once each, newest first: the places work can go back to.
  const seen = new Set<string>();
  const earlier = run.steps
    .slice(0, -1)
    .reverse()
    .filter((s) => (s.nodeId === step.nodeId || seen.has(s.nodeId) ? false : (seen.add(s.nodeId), true)));
  const latest = current.previousOutputs[current.previousOutputs.length - 1];
  const latestOutput = latest ? formatOutput(latest.output) : null;

  const decide = (decision: "approved" | "rejected" | "sent_back") =>
    void onDecide({ decision, comment: comment.trim() || undefined, sendBackTo: decision === "sent_back" ? sendBackTo : undefined });

  return (
    <section aria-labelledby={`${id}-heading`}>
      <SectionHeading>
        <span id={`${id}-heading`}>Waiting for approval</span>
      </SectionHeading>
      <Card>
        <CardSection>
          <TriageSuggestion runId={run.id} rev={run.rev} />
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="t-title-2 text-ink">{step.title}</h2>
              <p className="t-caption text-ink-3">{`Human approval · ${approverRole} or above can decide`}</p>
            </div>
            {record ? (
              <span className="t-caption shrink-0 text-ink-3">
                Waiting since <RelativeTime at={ts(record.startedAt)} />
              </span>
            ) : null}
          </div>
          {step.instructions || step.doneWhen || step.description ? <StepBrief current={current} /> : null}
          {latest ? (
            <Block label={`Work to review, from ${latest.title}`}>
              {latestOutput ? <MonoWell text={latestOutput} /> : <p className="t-body text-ink-3">That step recorded no output.</p>}
            </Block>
          ) : null}
        </CardSection>
        <CardSection>
          <Field label="Comment" htmlFor={`${id}-comment`} hint="Saved with your decision and shown on the step record.">
            <Textarea id={`${id}-comment`} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="primary" size="md" disabled={busy} loading={busy} onClick={() => decide("approved")}>
              Approve
            </Button>
            <Button variant="destructive" size="md" disabled={busy} onClick={() => decide("rejected")}>
              Reject
            </Button>
          </div>
        </CardSection>
        {earlier.length ? (
          <CardSection>
            <div className="flex flex-col gap-1">
              <p className="t-caption-strong text-ink-2">Send it back instead</p>
              <p className="t-caption text-ink-3">The run returns to that step and walks forward from there. Your comment goes with it.</p>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <Select
                aria-label="Step to send the work back to"
                className="sm:max-w-[320px]"
                value={sendBackTo}
                onValueChange={setSendBackTo}
                placeholder="Choose an earlier step"
                options={earlier.map((s) => ({ value: s.nodeId, label: s.nodeTitle }))}
              />
              <Button variant="secondary" size="md" disabled={busy || !sendBackTo} onClick={() => decide("sent_back")}>
                Send back
              </Button>
            </div>
          </CardSection>
        ) : null}
      </Card>
    </section>
  );
}

function Timeline({ run }: { run: WorkflowRun }): ReactNode {
  const titleOf = (nodeId?: string) => run.snapshot.nodes.find((n) => n.id === nodeId)?.title ?? nodeId;
  // Approval decisions are recorded without a display name; borrow one from
  // elsewhere in the run when the same actor appears with a label.
  const labels = new Map<string, string>();
  for (const actor of [run.startedBy, ...run.steps.map((s) => s.performedBy)]) if (actor?.label) labels.set(`${actor.type}:${actor.id}`, actor.label);
  const nameOf = (actor?: Actor) => (actor && !actor.label && labels.has(`${actor.type}:${actor.id}`) ? labels.get(`${actor.type}:${actor.id}`)! : actorName(actor));
  return (
    <section aria-labelledby="run-steps-heading">
      <SectionHeading>
        <span id="run-steps-heading">Steps</span>
      </SectionHeading>
      <Card>
        {run.steps.length === 0 ? (
          <p className="t-caption px-4 py-4 text-ink-3">No steps yet.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-hairline">
            {run.steps.map((step) => (
              <TimelineStep key={step.index} step={step} run={run} titleOf={titleOf} nameOf={nameOf} />
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}

function TimelineStep({ step, run, titleOf, nameOf }: { step: StepRecord; run: WorkflowRun; titleOf: (id?: string) => string | undefined; nameOf: (actor?: Actor) => string }): ReactNode {
  const open = !step.completedAt;
  const isCurrent = open && run.currentNodeId === step.nodeId && step.index === run.steps.length - 1;
  const outcome = open
    ? isCurrent
      ? run.status === "waiting_approval"
        ? { role: "caution" as const, label: "Waiting for approval" }
        : { role: "info" as const, label: "In progress" }
      : { role: "neutral" as const, label: "Not finished" }
    : outcomeView(step.outcome);
  const output = formatOutput(step.output);
  const started = formatStamp(step.startedAt);
  const ended = formatStamp(step.completedAt);
  const took = step.completedAt ? formatDuration((ts(step.completedAt) ?? 0) - (ts(step.startedAt) ?? 0)) : null;
  const approval = step.approval;
  const showNotes = step.notes && !(approval && approval.comment === step.notes);

  return (
    <li className="flex gap-3 px-4 py-4" aria-current={isCurrent ? "step" : undefined}>
      <span className="t-mono-seq w-[24px] shrink-0 pt-0.5 text-ink-3">{String(step.index + 1).padStart(2, "0")}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="t-body-strong text-ink">{step.nodeTitle}</p>
            <p className="t-caption text-ink-3">{nodeTypeLabel(step.nodeType)}</p>
          </div>
          <StatusPill role={outcome.role} className="self-start">
            {outcome.label}
          </StatusPill>
        </div>

        <p className="t-caption text-ink-3">
          {step.performedBy ? (
            <>
              {step.performedBy.type === "trigger" ? null : (
                <Avatar label={nameOf(step.performedBy)} kind={step.performedBy.type === "agent" ? "agent" : "human"} size={16} className="mr-1.5 inline-flex align-[-3px]" />
              )}
              <span className="text-ink-2">{nameOf(step.performedBy)}</span>
              {step.performedBy.type !== "user" ? ` (${actorKind(step.performedBy).toLowerCase()})` : ""}
              {" · "}
            </>
          ) : null}
          <span className="tabular">{ended ? `${started} to ${sameDay(step.startedAt, step.completedAt) ? formatClock(step.completedAt) : ended}` : `Started ${started}`}</span>
          {took ? <span className="tabular">{` · ${took}`}</span> : null}
        </p>

        <DecisionNotes step={step} />

        {approval ? (
          <div className="flex flex-col gap-0.5">
            <p className="t-body text-ink">
              {approval.decision === "approved" ? "Approved" : approval.decision === "rejected" ? "Rejected" : `Sent back to ${titleOf(approval.sentBackTo) ?? "an earlier step"}`} by {nameOf(approval.by)}
            </p>
            {approval.comment ? <p className="t-body whitespace-pre-wrap text-ink-2">{approval.comment}</p> : null}
          </div>
        ) : null}

        {showNotes ? (
          <Block label="Notes">
            <p className="t-body whitespace-pre-wrap text-ink-2">{step.notes}</p>
          </Block>
        ) : null}

        {output ? (
          <Block label="Output">
            <MonoWell text={output} />
          </Block>
        ) : null}
      </div>
    </li>
  );
}
