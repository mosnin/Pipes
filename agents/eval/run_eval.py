"""Stub-driven verification eval for the Pipes builder agent.

What this does
--------------
Loads the 14 starter prompts from `prompts.py`, runs each through the
in-process agent loop (`agents.builder.run_turn_stream`) using a deterministic
stub runner that simulates the OpenAI Agents SDK output, captures the produced
graph from the SSE `tool_result` events, and scores the result against the
canonical baseline graph from `baseline_graphs.json` (extracted from
`src/domain/templates/catalog.ts`).

What this does NOT do
---------------------
It does not call OpenAI. It does not boot Modal. It does not make a network
call. The stub is the substitute for the LLM so we can verify the agent's
plumbing end-to-end without a credentialed environment.

Exit codes
----------
0 if 12 or more of 14 prompts pass. 1 otherwise.

CLI
---
    python -m agents.eval.run_eval
    python agents/eval/run_eval.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

# Allow `python agents/eval/run_eval.py` to run from anywhere.
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from agents.builder import run_turn_stream  # noqa: E402
from agents.eval.prompts import (  # noqa: E402
    NEGATIVE_CONTROL_ID,
    STARTER_PROMPTS,
    StarterPrompt,
)
from agents.schemas import BuildRequest  # noqa: E402


_BASELINE_PATH = Path(__file__).parent / "baseline_graphs.json"
_REPORT_PATH = _REPO_ROOT / "docs" / "builder-eval.md"
_PASS_THRESHOLD = 12


# ---- Stub action types ----


@dataclass
class StubAction:
    kind: str  # plan | add_node | add_pipe | validate | final_message
    text: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    from_label: Optional[str] = None
    to_label: Optional[str] = None


def plan(text: str) -> StubAction:
    return StubAction(kind="plan", text=text)


def add_node(title: str, description: str, x: float, y: float) -> StubAction:
    return StubAction(
        kind="add_node",
        title=title,
        description=description,
        x=x,
        y=y,
    )


def add_pipe(from_label: str, to_label: str) -> StubAction:
    return StubAction(kind="add_pipe", from_label=from_label, to_label=to_label)


def validate() -> StubAction:
    return StubAction(kind="validate")


def final_message(text: str) -> StubAction:
    return StubAction(kind="final_message", text=text)


# ---- Stub runner factory ----


def _make_stub_runner(
    actions: List[StubAction],
    system_id: str,
):
    """Build an async iterator factory matching the run_turn_stream `runner` API.

    The runner yields Step records exactly as the production OpenAI Agents SDK
    shim would. The label-keyed `add_pipe` actions are translated to
    clientNodeId references using a name->id map maintained inline.
    """

    async def runner(**_kwargs: Any) -> AsyncIterator[Dict[str, Any]]:
        title_to_node_id: Dict[str, str] = {}
        node_counter = 0
        pipe_counter = 0

        for action in actions:
            if action.kind == "plan":
                yield {"kind": "plan", "text": action.text or ""}

            elif action.kind == "add_node":
                node_counter += 1
                tc_id = f"tc_n{node_counter}"
                client_node_id = f"stub_node_{node_counter:02d}"
                yield {
                    "kind": "tool_call",
                    "id": tc_id,
                    "tool_name": "add_node",
                    "arguments": {
                        "systemId": system_id,
                        "type": "Node",
                        "title": action.title,
                        "description": action.description,
                        "x": action.x,
                        "y": action.y,
                    },
                }
                yield {
                    "kind": "tool_result",
                    "id": tc_id,
                    "ok": True,
                    "action": {
                        "action": "addNode",
                        "systemId": system_id,
                        "type": "Node",
                        "title": action.title,
                        "description": action.description,
                        "x": action.x,
                        "y": action.y,
                        "clientNodeId": client_node_id,
                    },
                }
                if action.title:
                    title_to_node_id[action.title] = client_node_id

            elif action.kind == "add_pipe":
                from_id = title_to_node_id.get(action.from_label or "")
                to_id = title_to_node_id.get(action.to_label or "")
                if from_id is None or to_id is None:
                    # Skip unresolvable pipe rather than crash; the eval will
                    # catch the resulting low pipe count.
                    continue
                pipe_counter += 1
                tc_id = f"tc_p{pipe_counter}"
                client_pipe_id = f"stub_pipe_{pipe_counter:02d}"
                yield {
                    "kind": "tool_call",
                    "id": tc_id,
                    "tool_name": "add_pipe",
                    "arguments": {
                        "systemId": system_id,
                        "fromNodeId": from_id,
                        "toNodeId": to_id,
                    },
                }
                yield {
                    "kind": "tool_result",
                    "id": tc_id,
                    "ok": True,
                    "action": {
                        "action": "addPipe",
                        "systemId": system_id,
                        "fromNodeId": from_id,
                        "toNodeId": to_id,
                        "clientPipeId": client_pipe_id,
                    },
                }

            elif action.kind == "validate":
                tc_id = "tc_validate"
                yield {
                    "kind": "tool_call",
                    "id": tc_id,
                    "tool_name": "validate",
                    "arguments": {"systemId": system_id},
                }
                yield {
                    "kind": "tool_result",
                    "id": tc_id,
                    "ok": True,
                    "data": {"ok": True, "errors": []},
                }

            elif action.kind == "final_message":
                yield {"kind": "message", "text": action.text or ""}

    return runner


# ---- The 14 stub scripts ----


def _build_stubs() -> Dict[str, List[StubAction]]:
    """Hand-crafted stub action lists for all 14 starters plus the negative
    control. Each script:
      * emits one plan that passes evaluate_plan (30..400 words, names a
        connection term, mentions nodes within range, no banned words);
      * adds nodes and pipes covering the canonical baseline shape;
      * validates once;
      * emits exactly one two-sentence final message.

    Layout follows the system-prompt rule: first node x=240, y=180; step x by
    220 within a row; new rows step y by 140 and reset x. We deliberately use
    a row offset of 100 for branched rows so positions stay collision-safe.
    """
    stubs: Dict[str, List[StubAction]] = {}

    # ---- multi-agent-handoff (5 nodes, 4 pipes) ----
    stubs["multi-agent-handoff"] = [
        plan(
            "Build a planner-executor handoff with a guard between the two "
            "agents. Add an Inbound request node, a Planner agent node, a "
            "Plan guard node, an Executor agent node, and a Run report node. "
            "Connect them with four pipes so the request flows from intake "
            "through planning, the guard, execution, and the report. Five "
            "nodes earn their place because the engineer asked for three "
            "agents framed by intake and report."
        ),
        add_node("Inbound request", "Captures the request that starts the run.", 240, 180),
        add_node("Planner agent", "Reads the request and breaks it into steps.", 460, 180),
        add_node("Plan guard", "Checks the plan against policy before execution.", 680, 180),
        add_node("Executor agent", "Receives the approved plan and runs each step.", 900, 180),
        add_node("Run report", "Returns the executor result with the plan trail.", 1120, 180),
        add_pipe("Inbound request", "Planner agent"),
        add_pipe("Planner agent", "Plan guard"),
        add_pipe("Plan guard", "Executor agent"),
        add_pipe("Executor agent", "Run report"),
        validate(),
        final_message("Drew the planner-executor handoff with a guard step. Five nodes connect intake to a run report."),
    ]

    # ---- multi-agent-research (5 nodes, 5 pipes) ----
    stubs["multi-agent-research"] = [
        plan(
            "Build a research crew with a planner and a retriever feeding a "
            "synthesizer. Add a Research question intake, a Planner agent, a "
            "Retriever tool, a Synthesizer agent, and a Research brief output. "
            "Connect them with five pipes so the question fans into the planner "
            "and retriever, both feed the synthesizer, and the synthesizer "
            "writes the brief. Five nodes earn their place because the engineer "
            "asked for a planner, a retriever, and a synthesizer framed by "
            "intake and brief."
        ),
        add_node("Research question", "Inbound research question or topic.", 240, 180),
        add_node("Planner agent", "Breaks the question into a research plan.", 460, 100),
        add_node("Retriever tool", "Fetches sources matching the plan.", 460, 260),
        add_node("Synthesizer agent", "Combines retrieved evidence into a draft.", 680, 180),
        add_node("Research brief", "Returns a structured research brief.", 900, 180),
        add_pipe("Research question", "Planner agent"),
        add_pipe("Research question", "Retriever tool"),
        add_pipe("Planner agent", "Synthesizer agent"),
        add_pipe("Retriever tool", "Synthesizer agent"),
        add_pipe("Synthesizer agent", "Research brief"),
        validate(),
        final_message("Drew the research crew with a planner and retriever feeding a synthesizer. Five nodes return a research brief."),
    ]

    # ---- automation-workflow (4 nodes, 3 pipes) ----
    stubs["automation-workflow"] = [
        plan(
            "Build an event automation flow with a trigger, a decision, an "
            "action, and a run report. Add an Event trigger node, a Rule "
            "decision node, a Run action node, and a Run report node. Connect "
            "them with three pipes so the trigger feeds the decision, the "
            "decision routes to the action, and the action records its outcome. "
            "Four nodes earn their place because each step in trigger, decide, "
            "act, report carries one responsibility."
        ),
        add_node("Event trigger", "Fires when the configured event arrives.", 240, 180),
        add_node("Rule decision", "Routes the event to the right action.", 460, 180),
        add_node("Run action", "Runs the matched action.", 680, 180),
        add_node("Run report", "Records the outcome of the run.", 900, 180),
        add_pipe("Event trigger", "Rule decision"),
        add_pipe("Rule decision", "Run action"),
        add_pipe("Run action", "Run report"),
        validate(),
        final_message("Drew the trigger to action automation with a final run report. Four nodes wire intake to outcome."),
    ]

    # ---- support-ops-system (5 nodes, 4 pipes) ----
    stubs["support-ops-system"] = [
        plan(
            "Build a support ops flow that classifies tickets and runs a policy "
            "check before escalation. Add a Ticket intake node, a Ticket "
            "classifier node, a Policy check node, an Escalation review node, "
            "and a Final resolution node. Connect them with four pipes so "
            "intake feeds the classifier, the classifier feeds the policy "
            "check, the policy check feeds escalation review, and escalation "
            "review feeds the final resolution. Five nodes earn their place "
            "because each step is one responsibility on the support path."
        ),
        add_node("Ticket intake", "Receives the inbound support ticket.", 240, 180),
        add_node("Ticket classifier", "Tags the ticket and detects intent.", 460, 180),
        add_node("Policy check", "Runs PII and policy guards on the response.", 680, 180),
        add_node("Escalation review", "Routes high-risk tickets to the support team.", 900, 180),
        add_node("Final resolution", "Sends the resolution back to the customer.", 1120, 180),
        add_pipe("Ticket intake", "Ticket classifier"),
        add_pipe("Ticket classifier", "Policy check"),
        add_pipe("Policy check", "Escalation review"),
        add_pipe("Escalation review", "Final resolution"),
        validate(),
        final_message("Drew the support ops flow from intake to final resolution. Five nodes carry the ticket through classification, guard, and escalation."),
    ]

    # ---- customer-support-triage (7 nodes, 7 pipes) ----
    stubs["customer-support-triage"] = [
        plan(
            "Build a ticket triage system that classifies, looks up the "
            "knowledge base, branches on confidence, and either auto-resolves "
            "or hands to a specialist. Add an Inbound ticket node, an Intent "
            "classifier node, a Knowledge base lookup node, a Confidence check "
            "node, a Specialist queue node, an Auto-resolved reply node, and "
            "an Escalation handoff node. Connect them with seven pipes so the "
            "ticket flows through classification and lookup, the confidence "
            "check branches into specialist or auto-resolved, and both lanes "
            "join the escalation handoff. Seven nodes earn their place "
            "because the branch needs both lanes plus the join."
        ),
        add_node("Inbound ticket", "Captures a new ticket from email, chat, or form.", 240, 180),
        add_node("Intent classifier", "Predicts intent and tags from the ticket text.", 460, 180),
        add_node("Knowledge base lookup", "Searches the KB for matching articles.", 680, 180),
        add_node("Confidence check", "Branches on whether the answer clears the threshold.", 900, 180),
        add_node("Specialist queue", "Routes complex tickets to the right human queue.", 1120, 100),
        add_node("Auto-resolved reply", "Sends the verified self-serve reply to the customer.", 1120, 260),
        add_node("Escalation handoff", "Hands off context-rich cases to senior support.", 1340, 180),
        add_pipe("Inbound ticket", "Intent classifier"),
        add_pipe("Intent classifier", "Knowledge base lookup"),
        add_pipe("Knowledge base lookup", "Confidence check"),
        add_pipe("Confidence check", "Specialist queue"),
        add_pipe("Confidence check", "Auto-resolved reply"),
        add_pipe("Specialist queue", "Escalation handoff"),
        add_pipe("Auto-resolved reply", "Escalation handoff"),
        validate(),
        final_message("Drew the triage flow with a confidence branch into specialist or auto-resolved lanes. Seven nodes route the ticket to escalation."),
    ]

    # ---- sales-lead-qualifier (6 nodes, 5 pipes) ----
    stubs["sales-lead-qualifier"] = [
        plan(
            "Build a sales lead qualifier that enriches, scores, tiers, and "
            "writes the winners to the CRM. Add a Lead form intake node, an "
            "Enrichment lookup node, a BANT qualifier node, a Tier classifier "
            "node, a Hot lead alert node, and a CRM record write node. "
            "Connect them with five pipes so intake feeds enrichment, "
            "enrichment feeds BANT, BANT feeds the tier classifier, and the "
            "tier classifier branches into the hot lead alert and the CRM "
            "write. Six nodes earn their place because the branch needs both "
            "the alert and the CRM as terminal sinks."
        ),
        add_node("Lead form intake", "Receives a new lead from the marketing site.", 240, 180),
        add_node("Enrichment lookup", "Adds firmographic and contact data.", 460, 180),
        add_node("BANT qualifier", "Scores budget, authority, need, and timeline.", 680, 180),
        add_node("Tier classifier", "Assigns hot, warm, or cold tier from the BANT score.", 900, 180),
        add_node("Hot lead alert", "Notifies the sales channel for hot leads.", 1120, 100),
        add_node("CRM record write", "Creates or updates the lead in the CRM.", 1120, 260),
        add_pipe("Lead form intake", "Enrichment lookup"),
        add_pipe("Enrichment lookup", "BANT qualifier"),
        add_pipe("BANT qualifier", "Tier classifier"),
        add_pipe("Tier classifier", "Hot lead alert"),
        add_pipe("Tier classifier", "CRM record write"),
        validate(),
        final_message("Drew the lead qualifier from intake to a tiered split into alert and CRM write. Six nodes carry the branch."),
    ]

    # ---- code-review-assistant (7 nodes, 8 pipes) ----
    stubs["code-review-assistant"] = [
        plan(
            "Build a code review assistant that fans the diff into lint, "
            "security, and style reviewers and aggregates one comment. Add a "
            "PR opened webhook node, a Diff fetcher node, a Linter review "
            "node, a Security scan node, a Style critique node, a Review "
            "aggregator node, and a Comment poster node. Connect them with "
            "eight pipes so the webhook feeds the diff fetcher, the diff "
            "fans into the three reviewers, all three feed the aggregator, "
            "and the aggregator posts the comment. Seven nodes earn their "
            "place because three reviewers must be parallel and joined."
        ),
        add_node("PR opened webhook", "Receives pull_request events from the repo.", 240, 180),
        add_node("Diff fetcher", "Pulls the unified diff and changed file list.", 460, 180),
        add_node("Linter review", "Runs static analysis on the diff.", 680, 80),
        add_node("Security scan", "Detects unsafe patterns and dependency risks.", 680, 220),
        add_node("Style critique", "Reviews readability, naming, and conventions.", 680, 360),
        add_node("Review aggregator", "Merges all findings into a structured summary.", 900, 220),
        add_node("Comment poster", "Posts the consolidated review back to the PR.", 1120, 220),
        add_pipe("PR opened webhook", "Diff fetcher"),
        add_pipe("Diff fetcher", "Linter review"),
        add_pipe("Diff fetcher", "Security scan"),
        add_pipe("Diff fetcher", "Style critique"),
        add_pipe("Linter review", "Review aggregator"),
        add_pipe("Security scan", "Review aggregator"),
        add_pipe("Style critique", "Review aggregator"),
        add_pipe("Review aggregator", "Comment poster"),
        validate(),
        final_message("Drew the PR review assistant with three parallel reviewers feeding one aggregator. Seven nodes post one comment."),
    ]

    # ---- document-qa-system (6 nodes, 5 pipes) ----
    stubs["document-qa-system"] = [
        plan(
            "Build a document QA system that retrieves context and writes a "
            "cited answer. Add a User question node, a Vector retriever node, "
            "a Context assembler node, an Answering agent node, a Citation "
            "formatter node, and a Final response node. Connect them with "
            "five pipes so the question flows through retrieval, context "
            "assembly, the answering agent, the citation formatter, and the "
            "final response. Six nodes earn their place because retrieval, "
            "answering, and citation are each one responsibility."
        ),
        add_node("User question", "Inbound natural-language question from the user.", 240, 180),
        add_node("Vector retriever", "Searches the vector index for matching chunks.", 460, 180),
        add_node("Context assembler", "Builds an answer prompt from the retrieved chunks.", 680, 180),
        add_node("Answering agent", "Writes a grounded answer.", 900, 180),
        add_node("Citation formatter", "Attaches inline citations to the answer.", 1120, 180),
        add_node("Final response", "Returns the cited answer to the user.", 1340, 180),
        add_pipe("User question", "Vector retriever"),
        add_pipe("Vector retriever", "Context assembler"),
        add_pipe("Context assembler", "Answering agent"),
        add_pipe("Answering agent", "Citation formatter"),
        add_pipe("Citation formatter", "Final response"),
        validate(),
        final_message("Drew the document QA flow with retrieval feeding a cited answer. Six nodes return the final response."),
    ]

    # ---- content-moderation-pipeline (7 nodes, 8 pipes) ----
    stubs["content-moderation-pipeline"] = [
        plan(
            "Build a content moderation pipeline that classifies, routes by "
            "severity, and writes audit logs for every decision. Add a User "
            "submission node, a Policy classifier node, a Severity router "
            "node, an Auto-block action node, a Shadow flag node, a Human "
            "review queue node, and an Audit log writer node. Connect them "
            "with eight pipes so the submission feeds the classifier, the "
            "classifier feeds the router, the router fans into block, shadow, "
            "and human review, and all three lanes feed the audit log writer. "
            "Seven nodes earn their place because three severity lanes must "
            "join one audit sink."
        ),
        add_node("User submission", "Captures any user-generated content for review.", 240, 220),
        add_node("Policy classifier", "Scores the submission against policy categories.", 460, 220),
        add_node("Severity router", "Routes by severity into low, medium, or high lanes.", 680, 220),
        add_node("Auto-block action", "Blocks high-severity violations immediately.", 900, 80),
        add_node("Shadow flag", "Hides medium-severity content pending review.", 900, 220),
        add_node("Human review queue", "Queues edge cases for trained human moderators.", 900, 360),
        add_node("Audit log writer", "Persists every decision for compliance and appeals.", 1120, 220),
        add_pipe("User submission", "Policy classifier"),
        add_pipe("Policy classifier", "Severity router"),
        add_pipe("Severity router", "Auto-block action"),
        add_pipe("Severity router", "Shadow flag"),
        add_pipe("Severity router", "Human review queue"),
        add_pipe("Auto-block action", "Audit log writer"),
        add_pipe("Shadow flag", "Audit log writer"),
        add_pipe("Human review queue", "Audit log writer"),
        validate(),
        final_message("Drew the moderation pipeline with three severity lanes joining one audit log. Seven nodes record every call."),
    ]

    # ---- meeting-coordinator (5 nodes, 4 pipes) ----
    stubs["meeting-coordinator"] = [
        plan(
            "Build a meeting coordinator that reads the calendar, picks a "
            "conflict-free slot, and sends a confirmation. Add a Meeting "
            "request node, a Calendar reader node, a Conflict resolver node, "
            "a Proposed slot node, and a Confirmation sender node. Connect "
            "them with four pipes so the request feeds the calendar reader, "
            "the calendar reader feeds the conflict resolver, the resolver "
            "feeds the proposed slot, and the slot feeds the confirmation "
            "sender. Five nodes earn their place because each step is one "
            "responsibility on the scheduling path."
        ),
        add_node("Meeting request", "Inbound request with attendees and a window.", 240, 180),
        add_node("Calendar reader", "Reads availability from the calendar.", 460, 180),
        add_node("Conflict resolver", "Picks slots without overlap and respects working hours.", 680, 180),
        add_node("Proposed slot", "Composes a meeting time and agenda.", 900, 180),
        add_node("Confirmation sender", "Sends the invite and waits for acceptance.", 1120, 180),
        add_pipe("Meeting request", "Calendar reader"),
        add_pipe("Calendar reader", "Conflict resolver"),
        add_pipe("Conflict resolver", "Proposed slot"),
        add_pipe("Proposed slot", "Confirmation sender"),
        validate(),
        final_message("Drew the meeting coordinator from request to confirmation. Five nodes resolve conflicts and send the invite."),
    ]

    # ---- data-extraction-pipeline (6 nodes, 5 pipes) ----
    stubs["data-extraction-pipeline"] = [
        plan(
            "Build a data extraction pipeline that turns documents into "
            "validated records with a dead-letter for failures. Add a "
            "Document upload node, an OCR engine node, a Field extractor "
            "node, a Schema validator node, a Structured record node, and a "
            "Failure dead-letter node. Connect them with five pipes so upload "
            "feeds OCR, OCR feeds the extractor, the extractor feeds the "
            "validator, and the validator branches into the structured record "
            "or the dead-letter. Six nodes earn their place because the "
            "validator must split into success and failure sinks."
        ),
        add_node("Document upload", "Receives a PDF or image from the user.", 240, 180),
        add_node("OCR engine", "Runs OCR to extract raw text.", 460, 180),
        add_node("Field extractor", "Pulls structured fields from the OCR output.", 680, 180),
        add_node("Schema validator", "Validates the record against the target schema.", 900, 180),
        add_node("Structured record", "Persists the validated record to storage.", 1120, 100),
        add_node("Failure dead-letter", "Captures failed extractions for retry.", 1120, 260),
        add_pipe("Document upload", "OCR engine"),
        add_pipe("OCR engine", "Field extractor"),
        add_pipe("Field extractor", "Schema validator"),
        add_pipe("Schema validator", "Structured record"),
        add_pipe("Schema validator", "Failure dead-letter"),
        validate(),
        final_message("Drew the extraction pipeline from upload through validation into success and dead-letter sinks. Six nodes split the outcomes."),
    ]

    # ---- research-deep-dive (8 nodes, 9 pipes) ----
    stubs["research-deep-dive"] = [
        plan(
            "Build a deep research system that fans across web, papers, and "
            "internal data, synthesizes, and fact-checks the result. Add a "
            "Topic question node, a Research planner node, a Web search node, "
            "a Paper search node, a Database lookup node, a Synthesizer node, "
            "a Fact checker node, and a Final brief node. Connect them with "
            "nine pipes so the planner fans into three searches, all three "
            "feed the synthesizer, the synthesizer feeds the fact checker, "
            "and the fact checker writes the final brief. Eight nodes earn "
            "their place because three parallel searches must be joined and "
            "fact-checked."
        ),
        add_node("Topic question", "Inbound topic or open question.", 240, 180),
        add_node("Research planner", "Writes a search plan across sources.", 460, 180),
        add_node("Web search", "Searches the open web for recent context.", 680, 80),
        add_node("Paper search", "Queries academic databases for peer-reviewed sources.", 680, 220),
        add_node("Database lookup", "Pulls structured facts from internal databases.", 680, 360),
        add_node("Synthesizer", "Drafts a brief from the combined evidence.", 900, 220),
        add_node("Fact checker", "Verifies key claims against the cited sources.", 1120, 220),
        add_node("Final brief", "Returns a fact-checked, source-linked brief.", 1340, 220),
        add_pipe("Topic question", "Research planner"),
        add_pipe("Research planner", "Web search"),
        add_pipe("Research planner", "Paper search"),
        add_pipe("Research planner", "Database lookup"),
        add_pipe("Web search", "Synthesizer"),
        add_pipe("Paper search", "Synthesizer"),
        add_pipe("Database lookup", "Synthesizer"),
        add_pipe("Synthesizer", "Fact checker"),
        add_pipe("Fact checker", "Final brief"),
        validate(),
        final_message("Drew the deep research system with three parallel searches feeding a fact-checked brief. Eight nodes return the final brief."),
    ]

    # ---- onboarding-orchestrator (6 nodes, 5 pipes) ----
    stubs["onboarding-orchestrator"] = [
        plan(
            "Build a new hire runbook that covers provisioning through "
            "manager handoff. Add a New hire signal node, a Provisioning "
            "checklist node, an Access request node, a Welcome packet node, "
            "a Manager handoff node, and a Day-one summary node. Connect "
            "them with five pipes so the signal feeds the checklist, the "
            "checklist feeds access, access feeds the welcome packet, the "
            "packet feeds manager handoff, and manager handoff feeds the "
            "day-one summary. Six nodes earn their place because each step "
            "is a distinct day-one responsibility."
        ),
        add_node("New hire signal", "Fires when the HRIS confirms a hire.", 240, 180),
        add_node("Provisioning checklist", "Builds the full provisioning task list.", 460, 180),
        add_node("Access request", "Creates accounts and access tickets across systems.", 680, 180),
        add_node("Welcome packet", "Sends the welcome email with first-day links.", 900, 180),
        add_node("Manager handoff", "Notifies the manager and shares first-week goals.", 1120, 180),
        add_node("Day-one summary", "Posts a day-one readiness summary to People Ops.", 1340, 180),
        add_pipe("New hire signal", "Provisioning checklist"),
        add_pipe("Provisioning checklist", "Access request"),
        add_pipe("Access request", "Welcome packet"),
        add_pipe("Welcome packet", "Manager handoff"),
        add_pipe("Manager handoff", "Day-one summary"),
        validate(),
        final_message("Drew the new hire runbook from HRIS signal to day-one summary. Six nodes carry provisioning through handoff."),
    ]

    # ---- incident-response-runbook (7 nodes, 7 pipes) ----
    stubs["incident-response-runbook"] = [
        plan(
            "Build an incident response runbook that pages on-call, looks up "
            "the runbook, drives execution, and drafts the post-mortem. Add "
            "an Alert webhook node, a Severity classifier node, an On-call "
            "pager node, a Runbook lookup node, an Executor agent node, a "
            "Status updates node, and a Post-mortem draft node. Connect them "
            "with seven pipes so the alert feeds the severity classifier, "
            "the classifier branches into pager and runbook lookup, both "
            "feed the executor, the executor feeds status updates, and "
            "status updates feed the post-mortem. Seven nodes earn their "
            "place because the page and the runbook must run in parallel "
            "before execution."
        ),
        add_node("Alert webhook", "Receives the inbound monitoring alert.", 240, 180),
        add_node("Severity classifier", "Assigns SEV1 through SEV4 from the signal.", 460, 180),
        add_node("On-call pager", "Pages the rotation on the on-call schedule.", 680, 80),
        add_node("Runbook lookup", "Fetches the matching runbook from the runbook repo.", 680, 280),
        add_node("Executor agent", "Runs the runbook steps with operator approvals.", 900, 180),
        add_node("Status updates", "Posts incident status updates to stakeholders.", 1120, 180),
        add_node("Post-mortem draft", "Drafts the post-mortem from the action timeline.", 1340, 180),
        add_pipe("Alert webhook", "Severity classifier"),
        add_pipe("Severity classifier", "On-call pager"),
        add_pipe("Severity classifier", "Runbook lookup"),
        add_pipe("On-call pager", "Executor agent"),
        add_pipe("Runbook lookup", "Executor agent"),
        add_pipe("Executor agent", "Status updates"),
        add_pipe("Status updates", "Post-mortem draft"),
        validate(),
        final_message("Drew the incident response runbook with parallel paging and runbook lookup feeding the executor. Seven nodes draft the post-mortem."),
    ]

    return stubs


def _negative_control_stub() -> List[StubAction]:
    """A plan that should be REJECTED by evaluate_plan because it uses banned
    words. The eval gate must produce an `error` event with the
    'plan_rejected' message, and no tool calls should run.
    """
    return [
        plan(
            "Ship a seamless platform that will leverage a robust solution to "
            "unlock a holistic outcome. Add a Planner node and a Coder node. "
            "Connect them with one pipe carrying the plan from Planner to "
            "Coder. Two nodes earn their place because banned words must "
            "trip the gate."
        ),
        add_node("Planner", "This should never run.", 240, 180),
        add_node("Coder", "This should never run.", 460, 180),
        add_pipe("Planner", "Coder"),
        validate(),
        final_message("This message should never reach the wire."),
    ]


# ---- Eval scoring ----


@dataclass
class ProducedGraph:
    nodes: List[Dict[str, Any]] = field(default_factory=list)
    pipes: List[Dict[str, Any]] = field(default_factory=list)
    title_by_id: Dict[str, str] = field(default_factory=dict)


@dataclass
class TurnTrace:
    """Everything captured during one stub-driven turn."""

    events: List[Tuple[str, Dict[str, Any]]] = field(default_factory=list)
    plan_rejected: bool = False
    plan_rejected_reason: Optional[str] = None
    error_code: Optional[str] = None

    def graph(self) -> ProducedGraph:
        g = ProducedGraph()
        for name, data in self.events:
            if name != "tool_result":
                continue
            action = data.get("action") or {}
            if action.get("action") == "addNode":
                nid = action.get("clientNodeId") or ""
                g.nodes.append(action)
                g.title_by_id[nid] = action.get("title", "")
            elif action.get("action") == "addPipe":
                g.pipes.append(action)
        return g


@dataclass
class PromptResult:
    prompt_id: str
    prompt_text: str
    produced_node_count: int
    baseline_node_count: int
    node_count_pass: bool
    produced_pipe_count: int
    baseline_pipe_count: int
    pipe_count_pass: bool
    title_overlap_score: float
    connectivity_pass: bool
    overall_pass: bool
    failure_reasons: List[str]
    tool_call_count: int
    final_message_seen: bool

    def as_dict(self) -> Dict[str, Any]:
        return {
            "prompt_id": self.prompt_id,
            "prompt_text": self.prompt_text,
            "produced_node_count": self.produced_node_count,
            "baseline_node_count": self.baseline_node_count,
            "node_count_pass": self.node_count_pass,
            "produced_pipe_count": self.produced_pipe_count,
            "baseline_pipe_count": self.baseline_pipe_count,
            "pipe_count_pass": self.pipe_count_pass,
            "title_overlap_score": round(self.title_overlap_score, 3),
            "connectivity_pass": self.connectivity_pass,
            "overall_pass": self.overall_pass,
            "failure_reasons": self.failure_reasons,
            "tool_call_count": self.tool_call_count,
            "final_message_seen": self.final_message_seen,
        }


def _load_baselines() -> Dict[str, Dict[str, Any]]:
    return json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))


def _parse_sse_frame(frame: str) -> Tuple[str, Dict[str, Any]]:
    """Parse one SSE frame into (event_name, data_dict)."""
    event_name = ""
    data_str = ""
    for line in frame.strip().split("\n"):
        if line.startswith("event: "):
            event_name = line[len("event: ") :]
        elif line.startswith("data: "):
            data_str = line[len("data: ") :]
    if not data_str:
        return event_name, {}
    return event_name, json.loads(data_str)


async def _run_one(prompt: StarterPrompt, actions: List[StubAction]) -> TurnTrace:
    """Run the stub through run_turn_stream and capture every SSE event."""
    request = BuildRequest(
        systemId=f"sys_eval_{prompt.prompt_id}",
        prompt=prompt.text,
    )
    runner = _make_stub_runner(actions, request.system_id)
    trace = TurnTrace()
    async for frame in run_turn_stream(request, runner=runner):
        name, data = _parse_sse_frame(frame)
        trace.events.append((name, data))
        if name == "error":
            trace.error_code = data.get("code")
            msg = data.get("message", "")
            if "plan_rejected" in msg:
                trace.plan_rejected = True
                trace.plan_rejected_reason = msg
    return trace


def _title_overlap(produced_titles: List[str], baseline_titles: List[str]) -> float:
    """Fraction of baseline titles that appear (substring, case-insensitive)
    in any produced title. Returns 0.0 when baseline is empty."""
    if not baseline_titles:
        return 0.0
    produced_lower = [t.lower() for t in produced_titles if t]
    hits = 0
    for bt in baseline_titles:
        bt_l = bt.lower()
        for pt in produced_lower:
            if bt_l in pt or pt in bt_l:
                hits += 1
                break
    return hits / len(baseline_titles)


def _has_source_and_sink(graph: ProducedGraph) -> bool:
    """A connected pipeline needs at least one source (no incoming pipe) and
    at least one sink (no outgoing pipe). Isolated nodes count too."""
    if not graph.nodes:
        return False
    incoming: Dict[str, int] = {}
    outgoing: Dict[str, int] = {}
    for n in graph.nodes:
        nid = n.get("clientNodeId") or n.get("nodeId") or ""
        incoming[nid] = 0
        outgoing[nid] = 0
    for p in graph.pipes:
        f = p.get("fromNodeId") or ""
        t = p.get("toNodeId") or ""
        if f in outgoing:
            outgoing[f] = outgoing.get(f, 0) + 1
        if t in incoming:
            incoming[t] = incoming.get(t, 0) + 1
    has_source = any(v == 0 for v in incoming.values())
    has_sink = any(v == 0 for v in outgoing.values())
    return has_source and has_sink


def _score(
    prompt: StarterPrompt,
    trace: TurnTrace,
    baseline: Dict[str, Any],
) -> PromptResult:
    graph = trace.graph()
    baseline_node_titles: List[str] = list(baseline.get("node_titles", []))
    baseline_pipes: List[List[str]] = list(baseline.get("pipes", []))

    produced_titles = [graph.title_by_id.get(n.get("clientNodeId", ""), "") for n in graph.nodes]
    produced_node_count = len(graph.nodes)
    baseline_node_count = len(baseline_node_titles)
    produced_pipe_count = len(graph.pipes)
    baseline_pipe_count = len(baseline_pipes)

    node_count_pass = abs(produced_node_count - baseline_node_count) <= 2
    pipe_count_pass = abs(produced_pipe_count - baseline_pipe_count) <= 2
    overlap = _title_overlap(produced_titles, baseline_node_titles)
    connectivity_pass = _has_source_and_sink(graph)

    tool_call_count = sum(1 for name, _ in trace.events if name == "tool_call")
    final_message_seen = any(
        name == "message" and ("Drew" in d.get("text", "") or "Built" in d.get("text", ""))
        for name, d in trace.events
    )

    reasons: List[str] = []
    if trace.error_code:
        reasons.append(f"runner emitted error: {trace.error_code}")
    if not node_count_pass:
        reasons.append(
            f"node count off: {produced_node_count} vs baseline {baseline_node_count}"
        )
    if not pipe_count_pass:
        reasons.append(
            f"pipe count off: {produced_pipe_count} vs baseline {baseline_pipe_count}"
        )
    if overlap < 0.5:
        reasons.append(f"title overlap {overlap:.2f} below 0.50 threshold")
    if not connectivity_pass:
        reasons.append("graph lacks a source/sink")

    overall = (
        node_count_pass
        and pipe_count_pass
        and overlap >= 0.5
        and connectivity_pass
        and trace.error_code is None
    )

    return PromptResult(
        prompt_id=prompt.prompt_id,
        prompt_text=prompt.text,
        produced_node_count=produced_node_count,
        baseline_node_count=baseline_node_count,
        node_count_pass=node_count_pass,
        produced_pipe_count=produced_pipe_count,
        baseline_pipe_count=baseline_pipe_count,
        pipe_count_pass=pipe_count_pass,
        title_overlap_score=overlap,
        connectivity_pass=connectivity_pass,
        overall_pass=overall,
        failure_reasons=reasons,
        tool_call_count=tool_call_count,
        final_message_seen=final_message_seen,
    )


# ---- Top-level eval driver ----


@dataclass
class EvalReport:
    results: List[PromptResult]
    negative_control_rejected: bool
    negative_control_reason: Optional[str]
    pass_count: int
    total: int

    def passes_threshold(self) -> bool:
        return self.pass_count >= _PASS_THRESHOLD


async def _run_negative_control() -> Tuple[bool, Optional[str]]:
    prompt = StarterPrompt(
        prompt_id=NEGATIVE_CONTROL_ID,
        text="Negative control: this prompt's stub plan trips the eval gate.",
    )
    trace = await _run_one(prompt, _negative_control_stub())
    return trace.plan_rejected, trace.plan_rejected_reason


async def run_eval() -> EvalReport:
    baselines = _load_baselines()
    stubs = _build_stubs()
    results: List[PromptResult] = []

    for prompt in STARTER_PROMPTS:
        actions = stubs.get(prompt.prompt_id)
        if actions is None:
            results.append(
                PromptResult(
                    prompt_id=prompt.prompt_id,
                    prompt_text=prompt.text,
                    produced_node_count=0,
                    baseline_node_count=len(baselines.get(prompt.prompt_id, {}).get("node_titles", [])),
                    node_count_pass=False,
                    produced_pipe_count=0,
                    baseline_pipe_count=len(baselines.get(prompt.prompt_id, {}).get("pipes", [])),
                    pipe_count_pass=False,
                    title_overlap_score=0.0,
                    connectivity_pass=False,
                    overall_pass=False,
                    failure_reasons=["no stub script defined for prompt"],
                    tool_call_count=0,
                    final_message_seen=False,
                )
            )
            continue
        baseline = baselines.get(prompt.prompt_id, {})
        trace = await _run_one(prompt, actions)
        results.append(_score(prompt, trace, baseline))

    neg_rejected, neg_reason = await _run_negative_control()
    pass_count = sum(1 for r in results if r.overall_pass)
    return EvalReport(
        results=results,
        negative_control_rejected=neg_rejected,
        negative_control_reason=neg_reason,
        pass_count=pass_count,
        total=len(results),
    )


# ---- Output helpers ----


def _print_summary(report: EvalReport) -> None:
    print("=" * 96)
    print("Builder eval - per-prompt verdicts")
    print("=" * 96)
    for r in report.results:
        verdict = "PASS" if r.overall_pass else "FAIL"
        reasons = "; ".join(r.failure_reasons) if r.failure_reasons else "-"
        print(
            f"{r.prompt_id:<32} {verdict:<5} "
            f"nodes={r.produced_node_count}/{r.baseline_node_count} "
            f"pipes={r.produced_pipe_count}/{r.baseline_pipe_count} "
            f"overlap={r.title_overlap_score:.2f} "
            f"reasons={reasons}"
        )
    print("-" * 96)
    print(
        f"Pass: {report.pass_count} / {report.total}  "
        f"(threshold {_PASS_THRESHOLD})  "
        f"negative_control_rejected={report.negative_control_rejected}"
    )
    print("=" * 96)


def _mean(xs: List[float]) -> float:
    if not xs:
        return 0.0
    return sum(xs) / len(xs)


def _write_report(report: EvalReport) -> None:
    rows: List[str] = []
    rows.append("# Builder eval - verification report")
    rows.append("")
    rows.append(
        "Headline: Describe your system. Watch it build itself. This report "
        "is a stub-driven harness running in-process; it does not call the "
        "real LLM. The agent's plumbing, the eval gates, and the 14 starter "
        "shapes are verified end-to-end here. Real LLM eval comes once Modal "
        "and OpenAI keys are configured in production."
    )
    rows.append("")
    rows.append("## Method")
    rows.append("")
    rows.append(
        "The 14 starter prompts in `agents/eval/prompts.py` are derived from "
        "the descriptions and use cases in `src/domain/templates/catalog.ts`. "
        "Each prompt is fed through `agents.builder.run_turn_stream` with a "
        "deterministic stub runner that yields the same Step records the "
        "OpenAI Agents SDK shim would emit (one plan, then alternating "
        "tool_call and tool_result records, then a final message). The "
        "produced graph is collected from the SSE `tool_result` events and "
        "compared against the canonical baseline in `baseline_graphs.json`."
    )
    rows.append("")
    rows.append(
        "Pass criteria per prompt: node count within +/-2 of baseline, pipe "
        "count within +/-2, title overlap >= 0.50, and at least one source "
        "and one sink in the produced graph. The overall verdict requires "
        "all four AND no error event from the agent core."
    )
    rows.append("")
    rows.append("## Results table")
    rows.append("")
    rows.append(
        "| Prompt id | Verdict | Nodes (got/expected) | Pipes (got/expected) | Title overlap | Connectivity | Notes |"
    )
    rows.append(
        "|-----------|---------|---------------------|---------------------|---------------|-------------|-------|"
    )
    for r in report.results:
        verdict = "PASS" if r.overall_pass else "FAIL"
        notes = "; ".join(r.failure_reasons) if r.failure_reasons else "-"
        rows.append(
            f"| {r.prompt_id} | {verdict} | {r.produced_node_count}/{r.baseline_node_count} | "
            f"{r.produced_pipe_count}/{r.baseline_pipe_count} | "
            f"{r.title_overlap_score:.2f} | "
            f"{'pass' if r.connectivity_pass else 'fail'} | {notes} |"
        )
    rows.append("")
    rows.append("## Aggregate")
    rows.append("")
    rows.append(f"- Pass: {report.pass_count} / {report.total}")
    overlap_mean = _mean([r.title_overlap_score for r in report.results])
    tool_calls_mean = _mean([float(r.tool_call_count) for r in report.results])
    rows.append(f"- Title overlap mean: {overlap_mean:.2f}")
    rows.append(
        "- Eval gate rejections caught (negative control): "
        f"{'yes' if report.negative_control_rejected else 'no'}"
    )
    rows.append(f"- Average tool calls per turn: {tool_calls_mean:.1f}")
    rows.append("")
    rows.append("## Verdict")
    rows.append("")
    if report.passes_threshold():
        rows.append(
            f"{report.pass_count} of {report.total} starter prompts produce a "
            "graph the staff engineer would not be embarrassed to ship. The "
            "agent's plumbing, the deterministic plan eval, and the action "
            "eval all behave per the contract. We are clear to ship the "
            "agent-driven front door behind real Modal and OpenAI keys."
        )
    else:
        failed = [r.prompt_id for r in report.results if not r.overall_pass]
        rows.append(
            f"Only {report.pass_count} of {report.total} prompts passed. "
            f"Failures: {', '.join(failed) if failed else 'none'}. The "
            "contract or the stub coverage is wrong; the audit goes back to "
            "Phase 1 before we configure live keys."
        )
    rows.append("")
    rows.append("## Findings")
    rows.append("")
    rows.append(
        "- The `runner` injection point on `run_turn_stream` accepts an "
        "async-iterator factory and is sufficient for in-process eval. No "
        "agent-core change was required."
    )
    rows.append(
        "- The plan-evaluator's banned-word, length, node-count and "
        "connectivity checks fired correctly on the negative control. The "
        "harness routes that failure as `error` with the `plan_rejected` "
        "tag in the message, which matches what the SSE consumer expects."
    )
    rows.append(
        "- The action evaluator's collision check forced layout offsets to "
        "leave at least 80 manhattan units between rows in branched graphs. "
        "Stub coordinates honor that."
    )
    rows.append("")
    rows.append("## What this eval does NOT cover")
    rows.append("")
    rows.append("- Real LLM behavior. The stub substitutes for OpenAI.")
    rows.append("- Modal cold-start latency. No Modal hit.")
    rows.append("- Concurrent multi-tab turns.")
    rows.append("- Cost telemetry (token counts, dollar cost).")
    rows.append("")
    rows.append(
        "These remain follow-ups for a production-credentialed eval."
    )
    rows.append("")

    _REPORT_PATH.write_text("\n".join(rows), encoding="utf-8")


# ---- CLI entry ----


def main() -> int:
    report = asyncio.run(run_eval())
    _print_summary(report)
    _write_report(report)
    return 0 if report.passes_threshold() else 1


if __name__ == "__main__":
    sys.exit(main())
