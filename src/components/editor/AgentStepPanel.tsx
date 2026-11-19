"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CheckRow, Quiet, SectionLabel } from "@/components/editor/editor-ui";
import type { StepSpec } from "@/domain/runs/types";
import type { StepRails } from "@/domain/rails/types";

const TIMEOUT_OPTIONS = [
  { value: "failure_route", label: "Take the failure route" },
  { value: "fail_run", label: "Fail the run" }
];
const INVALID_OPTIONS = [
  { value: "reject", label: "Refuse it, the agent fixes and resends" },
  { value: "failure_route", label: "Complete it as a failure" }
];

const DECISION_TYPES = new Set(["Decision", "Router", "Condition", "Switch", "Branch"]);
const CONSEQUENCE_OPTIONS = [
  { value: "low", label: "Low: easy to undo" },
  { value: "medium", label: "Medium: noticeable, fixable" },
  { value: "high", label: "High: never let Pipes decide alone" }
];

const listOf = (text: string) => text.split(",").map((item) => item.trim()).filter(Boolean);
const minutesOf = (ms?: number) => (ms ? String(Math.round(ms / 60000)) : "");
const dollarsOf = (micros?: number) => (micros ? String(micros / 1_000_000) : "");

export type WorkspaceConnection = { id: string; name: string; type: string; url: string };
export type ConnectionsState = { status: "loading" | "ready" | "error"; items: WorkspaceConnection[] };

const ANY_APPROVER = "any";
const APPROVER_OPTIONS = [
  { value: ANY_APPROVER, label: "Anyone who can edit" },
  { value: "Owner", label: "Owner" },
  { value: "Admin", label: "Admin" },
  { value: "Editor", label: "Editor" }
];

export function parseSkills(text: string): string[] {
  return text.split(",").map((item) => item.trim()).filter(Boolean);
}

/**
 * What an agent is handed when a run reaches this step: instructions, the
 * finish line, skills and connections, plus loop and approval limits where
 * the step needs them. Writes `design.steps[nodeId]`.
 */
export function AgentStepPanel({
  nodeId,
  nodeType,
  spec,
  hasLoopRoute,
  connections,
  onChange
}: {
  nodeId: string;
  nodeType: string;
  spec: StepSpec | undefined;
  hasLoopRoute: boolean;
  connections: ConnectionsState;
  onChange: (patch: Partial<StepSpec>) => void;
}): ReactNode {
  // Raw text for fields whose stored shape differs from what you type.
  const [skillsText, setSkillsText] = useState(() => (spec?.skills ?? []).join(", "));
  const [maxText, setMaxText] = useState(() => (spec?.maxIterations ? String(spec.maxIterations) : ""));
  const isLoop = nodeType === "Loop" || hasLoopRoute;
  const isApproval = nodeType === "HumanApproval";
  const selected = spec?.connectionIds ?? [];
  const rails = spec?.rails ?? {};
  const [timeoutText, setTimeoutText] = useState(() => minutesOf(rails.timeoutMs));
  const [outcomesText, setOutcomesText] = useState(() => (rails.allowedOutcomes ?? []).join(", "));
  const [fieldsText, setFieldsText] = useState(() => (rails.output?.schema.type === "object" ? rails.output.schema.required ?? [] : []).join(", "));
  const [costText, setCostText] = useState(() => dollarsOf(rails.maxCostMicros));
  const setRails = (patch: Partial<StepRails>) => {
    const next: StepRails = { ...rails, ...patch };
    const empty = Object.values(next).every((v) => v === undefined || (Array.isArray(v) && v.length === 0));
    onChange({ rails: empty ? undefined : next });
  };
  const decide = spec?.decide ?? {};
  const setDecide = (patch: Partial<NonNullable<StepSpec["decide"]>>) => {
    const next = { ...decide, ...patch };
    onChange({ decide: next.route || next.verifyDoneWhen ? next : undefined });
  };
  const isDecisionStep = DECISION_TYPES.has(nodeType);
  const timeoutValue = Number(timeoutText);
  const timeoutInvalid = timeoutText.trim() !== "" && (!Number.isFinite(timeoutValue) || timeoutValue <= 0);
  const costValue = Number(costText);
  const costInvalid = costText.trim() !== "" && (!Number.isFinite(costValue) || costValue <= 0);
  const maxValue = Number(maxText);
  const maxInvalid = maxText.trim() !== "" && (!Number.isInteger(maxValue) || maxValue < 1 || maxValue > 100);

  return (
    <div className="flex flex-col gap-3">
      <p className="t-caption text-ink-3">This is what an agent receives when a run reaches this step. Leave a field empty if the step does not need it.</p>
      <Field label="Instructions" htmlFor={`step-instructions-${nodeId}`} hint="Write it the way you would brief a colleague.">
        <Textarea
          id={`step-instructions-${nodeId}`}
          value={spec?.instructions ?? ""}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="Read the ticket, check the customer's plan, draft a reply"
        />
      </Field>
      <Field label="Done when" htmlFor={`step-done-${nodeId}`} hint="How the agent knows the step is finished.">
        <Input
          id={`step-done-${nodeId}`}
          value={spec?.doneWhen ?? ""}
          onChange={(e) => onChange({ doneWhen: e.target.value })}
          placeholder="A reply is drafted and tagged"
        />
      </Field>
      <Field label="Skills" htmlFor={`step-skills-${nodeId}`} hint="Names or URLs, separated by commas.">
        <Input
          id={`step-skills-${nodeId}`}
          value={skillsText}
          onChange={(e) => {
            setSkillsText(e.target.value);
            onChange({ skills: parseSkills(e.target.value) });
          }}
          placeholder="triage, refund-policy"
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <SectionLabel>Connections</SectionLabel>
        {connections.status === "loading" ? <Quiet>Loading connections…</Quiet> : null}
        {connections.status === "error" ? <Quiet>Connections could not be loaded.</Quiet> : null}
        {connections.status === "ready" && connections.items.length === 0 ? (
          <div className="flex flex-col items-start gap-1.5">
            <Quiet>No connections in this workspace yet. Add an MCP server or API in settings and it shows up here.</Quiet>
            <Button asChild size="xs" variant="secondary"><Link href="/settings/connections">Add a connection</Link></Button>
          </div>
        ) : null}
        {connections.status === "ready" && connections.items.length > 0 ? (
          <ul aria-label="Connections this step uses" className="flex flex-col gap-1.5">
            {connections.items.map((connection) => (
              <li key={connection.id}>
                <CheckRow
                  checked={selected.includes(connection.id)}
                  onChange={(e) => onChange({ connectionIds: e.target.checked ? [...selected, connection.id] : selected.filter((id) => id !== connection.id) })}
                >
                  <span className="block t-body-medium text-ink">{connection.name}</span>
                  <span className="block truncate t-mono-micro text-ink-3">{connection.type} · {connection.url}</span>
                </CheckRow>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {isLoop ? (
        <div className="flex flex-col gap-3 border-t border-hairline pt-3">
          <SectionLabel>Loop</SectionLabel>
          <Field label="Max iterations" htmlFor={`step-max-${nodeId}`} error={maxInvalid ? "Use a whole number from 1 to 100." : undefined} hint="The run leaves the loop after this many passes. 1 to 100.">
            <Input
              id={`step-max-${nodeId}`}
              inputMode="numeric"
              pattern="[0-9]*"
              invalid={maxInvalid}
              aria-describedby={`step-max-${nodeId}-message`}
              value={maxText}
              onChange={(e) => {
                const text = e.target.value;
                setMaxText(text);
                const value = Number(text);
                if (text.trim() === "") onChange({ maxIterations: undefined });
                else if (Number.isInteger(value) && value >= 1 && value <= 100) onChange({ maxIterations: value });
              }}
              placeholder="5"
              className="tabular-nums"
            />
          </Field>
          <Field label="Exit condition" htmlFor={`step-exit-${nodeId}`} hint="When to stop looping, in words.">
            <Input
              id={`step-exit-${nodeId}`}
              value={spec?.exitCondition ?? ""}
              onChange={(e) => onChange({ exitCondition: e.target.value })}
              placeholder="All tests pass"
            />
          </Field>
        </div>
      ) : null}

      {!isApproval && (isDecisionStep || spec?.doneWhen) ? (
        <div className="flex flex-col gap-3 border-t border-hairline pt-3">
          <SectionLabel>Decisions</SectionLabel>
          <p className="t-caption text-ink-3">Let Pipes judge this step with a decision model. Every judgment is recorded and you can see how often it is right on the Decisions page.</p>
          {isDecisionStep ? (
            <>
              <CheckRow checked={Boolean(decide.route)} onChange={(e) => setDecide({ route: e.target.checked })}>
                Let Pipes choose the route. When decisions are live and it is sure, it takes the route itself; otherwise it suggests one to whoever works the step.
              </CheckRow>
              {decide.route ? (
                <>
                  <Field label="If Pipes picks the wrong route, how bad is it?" htmlFor={`step-consequence-${nodeId}`}>
                    <Select
                      id={`step-consequence-${nodeId}`}
                      size="sm"
                      value={decide.consequence ?? "medium"}
                      onValueChange={(value) => setDecide({ consequence: value as "low" | "medium" | "high" })}
                      options={CONSEQUENCE_OPTIONS}
                    />
                  </Field>
                  <CheckRow checked={Boolean(decide.deliberate)} onChange={(e) => setDecide({ deliberate: e.target.checked })}>
                    When unsure, ask a stronger model for a second opinion. It can only confirm the first pick, never override it.
                  </CheckRow>
                </>
              ) : null}
            </>
          ) : null}
          {spec?.doneWhen ? (
            <CheckRow checked={Boolean(decide.verifyDoneWhen)} onChange={(e) => setDecide({ verifyDoneWhen: e.target.checked })}>
              Check each completion against Done when, and flag it on the run if it does not seem met. It never blocks the step.
            </CheckRow>
          ) : null}
        </div>
      ) : null}

      {!isApproval ? (
        <div className="flex flex-col gap-3 border-t border-hairline pt-3">
          <SectionLabel>Limits</SectionLabel>
          <p className="t-caption text-ink-3">Rails Pipes enforces when an agent works this step. All optional.</p>
          <Field label="Time limit in minutes" htmlFor={`step-timeout-${nodeId}`} error={timeoutInvalid ? "Use a number of minutes above 0." : undefined} hint="Counted from when the run reaches this step.">
            <Input
              id={`step-timeout-${nodeId}`}
              inputMode="decimal"
              invalid={timeoutInvalid}
              aria-describedby={`step-timeout-${nodeId}-message`}
              value={timeoutText}
              onChange={(e) => {
                const text = e.target.value;
                setTimeoutText(text);
                const value = Number(text);
                if (text.trim() === "") setRails({ timeoutMs: undefined, onTimeout: undefined });
                else if (Number.isFinite(value) && value > 0) setRails({ timeoutMs: Math.round(value * 60000), onTimeout: rails.onTimeout ?? "failure_route" });
              }}
              placeholder="No limit"
              className="tabular-nums"
            />
          </Field>
          {rails.timeoutMs ? (
            <Field label="When time runs out" htmlFor={`step-ontimeout-${nodeId}`}>
              <Select id={`step-ontimeout-${nodeId}`} size="sm" value={rails.onTimeout ?? "failure_route"} onValueChange={(value) => setRails({ onTimeout: value as StepRails["onTimeout"] })} options={TIMEOUT_OPTIONS} />
            </Field>
          ) : null}
          <Field label="Allowed outcomes" htmlFor={`step-outcomes-${nodeId}`} hint="Comma separated. Pipes refuses any other outcome. Leave empty to allow any.">
            <Input
              id={`step-outcomes-${nodeId}`}
              value={outcomesText}
              onChange={(e) => {
                setOutcomesText(e.target.value);
                const list = listOf(e.target.value);
                setRails({ allowedOutcomes: list.length ? list : undefined });
              }}
              placeholder="approve, deny"
            />
          </Field>
          <Field label="Required output fields" htmlFor={`step-fields-${nodeId}`} hint="Comma separated. The step's output must include each one.">
            <Input
              id={`step-fields-${nodeId}`}
              value={fieldsText}
              onChange={(e) => {
                setFieldsText(e.target.value);
                const list = listOf(e.target.value);
                setRails({ output: list.length ? { schema: { type: "object", required: list }, onInvalid: rails.output?.onInvalid ?? "reject" } : undefined });
              }}
              placeholder="amount, reason"
            />
          </Field>
          {rails.output ? (
            <Field label="When a field is missing" htmlFor={`step-invalid-${nodeId}`}>
              <Select
                id={`step-invalid-${nodeId}`}
                size="sm"
                value={rails.output.onInvalid}
                onValueChange={(value) => setRails({ output: { ...rails.output!, onInvalid: value as "reject" | "failure_route" } })}
                options={INVALID_OPTIONS}
              />
            </Field>
          ) : null}
          <Field label="Cost limit per completion, in dollars" htmlFor={`step-cost-${nodeId}`} error={costInvalid ? "Use an amount above 0." : undefined} hint="Agents report what a step cost. Pipes refuses a report over this.">
            <Input
              id={`step-cost-${nodeId}`}
              inputMode="decimal"
              invalid={costInvalid}
              aria-describedby={`step-cost-${nodeId}-message`}
              value={costText}
              onChange={(e) => {
                const text = e.target.value;
                setCostText(text);
                const value = Number(text);
                if (text.trim() === "") setRails({ maxCostMicros: undefined });
                else if (Number.isFinite(value) && value > 0) setRails({ maxCostMicros: Math.round(value * 1_000_000) });
              }}
              placeholder="No limit"
              className="tabular-nums"
            />
          </Field>
        </div>
      ) : null}

      {isApproval ? (
        <div className="flex flex-col gap-3 border-t border-hairline pt-3">
          <SectionLabel>Approval</SectionLabel>
          <Field label="Approver role" htmlFor={`step-approver-${nodeId}`} hint="The run waits here until someone with this role decides.">
            <Select
              id={`step-approver-${nodeId}`}
              size="sm"
              value={spec?.approverRole ?? ANY_APPROVER}
              onValueChange={(value) => onChange({ approverRole: value === ANY_APPROVER ? undefined : (value as StepSpec["approverRole"]) })}
              options={APPROVER_OPTIONS}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
