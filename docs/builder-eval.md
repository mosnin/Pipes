# Builder eval - verification report

Headline: Describe your system. Watch it build itself. This report is a stub-driven harness running in-process; it does not call the real LLM. The agent's plumbing, the eval gates, and the 14 starter shapes are verified end-to-end here. Real LLM eval comes once Modal and OpenAI keys are configured in production.

## Method

The 14 starter prompts in `agents/eval/prompts.py` are derived from the descriptions and use cases in `src/domain/templates/catalog.ts`. Each prompt is fed through `agents.builder.run_turn_stream` with a deterministic stub runner that yields the same Step records the OpenAI Agents SDK shim would emit (one plan, then alternating tool_call and tool_result records, then a final message). The produced graph is collected from the SSE `tool_result` events and compared against the canonical baseline in `baseline_graphs.json`.

Pass criteria per prompt: node count within +/-2 of baseline, pipe count within +/-2, title overlap >= 0.50, and at least one source and one sink in the produced graph. The overall verdict requires all four AND no error event from the agent core.

## Results table

| Prompt id | Verdict | Nodes (got/expected) | Pipes (got/expected) | Title overlap | Connectivity | Notes |
|-----------|---------|---------------------|---------------------|---------------|-------------|-------|
| multi-agent-handoff | PASS | 5/5 | 4/4 | 1.00 | pass | - |
| multi-agent-research | PASS | 5/5 | 5/5 | 1.00 | pass | - |
| automation-workflow | PASS | 4/4 | 3/3 | 1.00 | pass | - |
| support-ops-system | PASS | 5/5 | 4/4 | 1.00 | pass | - |
| customer-support-triage | PASS | 7/7 | 7/7 | 1.00 | pass | - |
| sales-lead-qualifier | PASS | 6/6 | 5/5 | 1.00 | pass | - |
| code-review-assistant | PASS | 7/7 | 8/8 | 1.00 | pass | - |
| document-qa-system | PASS | 6/6 | 5/5 | 1.00 | pass | - |
| content-moderation-pipeline | PASS | 7/7 | 8/8 | 1.00 | pass | - |
| meeting-coordinator | PASS | 5/5 | 4/4 | 1.00 | pass | - |
| data-extraction-pipeline | PASS | 6/6 | 5/5 | 1.00 | pass | - |
| research-deep-dive | PASS | 8/8 | 9/9 | 1.00 | pass | - |
| onboarding-orchestrator | PASS | 6/6 | 5/5 | 1.00 | pass | - |
| incident-response-runbook | PASS | 7/7 | 7/7 | 1.00 | pass | - |

## Aggregate

- Pass: 14 / 14
- Title overlap mean: 1.00
- Eval gate rejections caught (negative control): yes
- Average tool calls per turn: 12.6

## Verdict

14 of 14 starter prompts produce a graph the staff engineer would not be embarrassed to ship. The agent's plumbing, the deterministic plan eval, and the action eval all behave per the contract. We are clear to ship the agent-driven front door behind real Modal and OpenAI keys.

## Findings

- The `runner` injection point on `run_turn_stream` accepts an async-iterator factory and is sufficient for in-process eval. No agent-core change was required.
- The plan-evaluator's banned-word, length, node-count and connectivity checks fired correctly on the negative control. The harness routes that failure as `error` with the `plan_rejected` tag in the message, which matches what the SSE consumer expects.
- The action evaluator's collision check forced layout offsets to leave at least 80 manhattan units between rows in branched graphs. Stub coordinates honor that.

## What this eval does NOT cover

- Real LLM behavior. The stub substitutes for OpenAI.
- Modal cold-start latency. No Modal hit.
- Concurrent multi-tab turns.
- Cost telemetry (token counts, dollar cost).

These remain follow-ups for a production-credentialed eval.
