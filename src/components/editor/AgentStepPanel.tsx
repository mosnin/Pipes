"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CheckRow, Quiet, SectionLabel } from "@/components/editor/editor-ui";
import type { StepSpec } from "@/domain/runs/types";

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
  const maxValue = Number(maxText);
  const maxInvalid = maxText.trim() !== "" && (!Number.isInteger(maxValue) || maxValue < 1 || maxValue > 100);

  return (
    <div className="flex flex-col gap-5">
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

      <div className="flex flex-col gap-3">
        <SectionLabel>Connections</SectionLabel>
        {connections.status === "loading" ? <Quiet>Loading connections…</Quiet> : null}
        {connections.status === "error" ? <Quiet>Connections could not be loaded.</Quiet> : null}
        {connections.status === "ready" && connections.items.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <Quiet>No connections in this workspace yet. Add an MCP server or API in settings and it shows up here.</Quiet>
            <Button asChild size="xs" variant="secondary"><Link href="/settings/connections">Add a connection</Link></Button>
          </div>
        ) : null}
        {connections.status === "ready" && connections.items.length > 0 ? (
          <ul aria-label="Connections this step uses" className="flex flex-col gap-3">
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
        <div className="flex flex-col gap-5 border-t border-hairline pt-5">
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

      {isApproval ? (
        <div className="flex flex-col gap-5 border-t border-hairline pt-5">
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
