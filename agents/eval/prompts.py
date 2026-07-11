"""The 14 starter prompts the eval harness runs through the agent.

Each prompt is the natural-language sentence a staff engineer would type into
the prompt input on a fresh canvas. The prompt id matches the starter
template id in src/domain/templates/catalog.ts so eval results can be joined
back to the canonical baseline graph.

Voice rules from docs/audience.md apply here: one idea per sentence, verbs
over nouns, ASCII only, no banned words.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StarterPrompt:
    prompt_id: str
    text: str


STARTER_PROMPTS: tuple[StarterPrompt, ...] = (
    StarterPrompt(
        prompt_id="multi-agent-handoff",
        text=(
            "Build a planner agent that hands work off to an executor agent "
            "through a guard step."
        ),
    ),
    StarterPrompt(
        prompt_id="multi-agent-research",
        text=(
            "Build a research crew where a planner and a retriever feed a "
            "synthesizer that returns a brief."
        ),
    ),
    StarterPrompt(
        prompt_id="automation-workflow",
        text=(
            "Build an event automation where a trigger fires, a rule decides, "
            "and an action runs."
        ),
    ),
    StarterPrompt(
        prompt_id="support-ops-system",
        text=(
            "Build a support ops flow that classifies tickets, runs a policy "
            "check, and escalates when needed."
        ),
    ),
    StarterPrompt(
        prompt_id="customer-support-triage",
        text=(
            "Build a ticket triage system that classifies inbound support "
            "tickets, looks them up in the knowledge base, and either "
            "auto-resolves them or hands them to a specialist."
        ),
    ),
    StarterPrompt(
        prompt_id="sales-lead-qualifier",
        text=(
            "Build a sales lead qualifier that enriches inbound leads, scores "
            "them, tiers them, and writes the winners to the CRM."
        ),
    ),
    StarterPrompt(
        prompt_id="code-review-assistant",
        text=(
            "Build a code review assistant that runs lint, security, and "
            "style checks on every PR and posts one consolidated comment."
        ),
    ),
    StarterPrompt(
        prompt_id="document-qa-system",
        text=(
            "Build a document QA system that answers questions over a corpus "
            "with retrieved context and inline citations."
        ),
    ),
    StarterPrompt(
        prompt_id="content-moderation-pipeline",
        text=(
            "Build a content moderation pipeline that classifies submissions, "
            "routes by severity, and logs every decision for audit."
        ),
    ),
    StarterPrompt(
        prompt_id="meeting-coordinator",
        text=(
            "Build a meeting coordinator that reads the calendar, picks a "
            "conflict-free time, and sends a confirmation."
        ),
    ),
    StarterPrompt(
        prompt_id="data-extraction-pipeline",
        text=(
            "Build a data extraction pipeline that turns uploaded documents "
            "into validated records with a dead-letter for failures."
        ),
    ),
    StarterPrompt(
        prompt_id="research-deep-dive",
        text=(
            "Build a deep research system that searches the web, papers, and "
            "internal data, synthesizes, and fact-checks the result."
        ),
    ),
    StarterPrompt(
        prompt_id="onboarding-orchestrator",
        text=(
            "Build a new hire runbook that runs the checklist from "
            "provisioning through manager handoff."
        ),
    ),
    StarterPrompt(
        prompt_id="incident-response-runbook",
        text=(
            "Build an incident response runbook that pages on-call, looks up "
            "the runbook, drives the response, and drafts a post-mortem."
        ),
    ),
)


# The id we deliberately stub with a bad plan to verify the eval gate's
# rejection path. The negative control proves the gate fires; it is NOT
# counted against the 12-of-14 ship threshold.
NEGATIVE_CONTROL_ID: str = "negative-control-banned-word"


__all__ = ["STARTER_PROMPTS", "StarterPrompt", "NEGATIVE_CONTROL_ID"]
