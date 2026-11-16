"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList } from "@/components/settings/fact-list";
import { CodeSnippet, useOrigin } from "@/components/connections/code-snippet";
import { useIntro } from "@/lib/onboarding";
import { BandHeader } from "@/components/ui/greeting-band";
import { Bot, Plug, Workflow } from "@/components/ui/icon";

const LOOP: { title: string; mono: boolean; body: string }[] = [
  { title: "list_workflows", mono: true, body: "Find the workflow to run. get_workflow shows its steps before you commit to it." },
  { title: "start_run", mono: true, body: "Start a run with the workflow id and any input, such as the ticket being handled. Pipes returns the first step." },
  { title: "Do the step", mono: false, body: "Follow the step's instructions and its definition of done, using the skills and connections it names." },
  { title: "complete_step", mono: true, body: "Report the outcome and what the step produced. Pipes returns the next step, or tells you the run is waiting for approval or finished." },
  { title: "Repeat", mono: false, body: "Keep doing and completing steps until the run is completed. get_current_step picks a run back up after a break." }
];

export function ConnectAgentView(): ReactNode {
  useIntro("agents");
  const origin = useOrigin();
  const mcpUrl = `${origin || "https://your-pipes-host"}/api/mcp`;

  return (
    <SettingsShell
      title="Connect an agent"
      description="Pipes is an MCP server. Connect an agent once and it can list your workflows, start runs and work through them step by step."
      banner={
        <BandHeader palette="bloom" title="Connect an agent" icons={[Bot, Plug, Workflow]}>
          Pipes is an MCP server. Connect an agent once and it can list your workflows, start runs and work through them step by step.
        </BandHeader>
      }
    >
      <SettingsSection title="Server address">
        <CodeSnippet label="MCP server URL (Streamable HTTP)" code={mcpUrl} />
      </SettingsSection>

      <SettingsSection
        title="Sign in with OAuth"
        description="Claude, ChatGPT and Cursor only need the URL. Add Pipes as a custom connector or MCP server in the client's settings, sign in when it asks, and approve access to this workspace."
      >
        <div className="flex flex-col gap-3">
          <CodeSnippet label="Claude Code" code={`claude mcp add --transport http pipes ${mcpUrl}`} />
          <p className="t-caption text-ink-3">
            Clients find the sign-in flow on their own through <span className="t-mono-hash text-ink-2">/.well-known/oauth-authorization-server</span>.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Or use an API token"
        description={
          <>
            For clients without OAuth, scripts and CI. Create a token on{" "}
            <Link href="/settings/tokens" className="t-link text-ink-2">
              API tokens
            </Link>{" "}
            and send it with every request.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <CodeSnippet label="Request header" code="Authorization: Bearer <token>" />
          <p className="t-caption-medium mt-1 text-ink">Capabilities to grant the token</p>
          <Card>
            <FactList
              facts={[
                { label: <span className="t-mono-hash text-ink">systems:read</span>, value: <span className="text-ink-2">Find workflows and read their steps</span> },
                { label: <span className="t-mono-hash text-ink">runs:read</span>, value: <span className="text-ink-2">Read runs and the current step</span> },
                { label: <span className="t-mono-hash text-ink">runs:write</span>, value: <span className="text-ink-2">Start runs and complete steps</span> },
                {
                  label: <span className="t-mono-hash text-ink">connections:secrets</span>,
                  value: <span className="text-ink-2">Optional. Receive connection credentials with each step</span>
                }
              ]}
            />
          </Card>
        </div>
      </SettingsSection>

      <SettingsSection title="The run loop" description="Every agent follows the same loop, whatever the workflow. Pipes keeps the record of what happened.">
        <Card>
          <ol className="flex flex-col">
            {LOOP.map((item, index) => (
              <li key={item.title} className="flex gap-4 border-t border-hairline px-4 py-3 first:border-t-0">
                <span className="t-mono-hash w-[20px] shrink-0 pt-[1px] tabular text-ink-3">{index + 1}</span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={item.mono ? "t-mono-hash text-ink" : "t-body-strong text-ink"}>{item.title}</span>
                  <span className="t-body text-ink-2">{item.body}</span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </SettingsSection>
    </SettingsShell>
  );
}
