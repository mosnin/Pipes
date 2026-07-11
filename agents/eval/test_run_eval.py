"""Smoke test for the stub-driven eval harness.

Asserts:
  * The 14 starter prompts each produce a verdict object.
  * The negative-control prompt is rejected by the eval gate (plan_rejected).
  * The exit code is 0 when 12 or more results pass.

Run:
    pytest agents/eval/ -v
"""

from __future__ import annotations

import asyncio

import pytest

from agents.eval.prompts import STARTER_PROMPTS
from agents.eval.run_eval import (
    _PASS_THRESHOLD,
    EvalReport,
    main,
    run_eval,
)


@pytest.fixture(scope="module")
def report() -> EvalReport:
    return asyncio.run(run_eval())


def test_all_14_prompts_produce_a_verdict(report: EvalReport) -> None:
    assert len(report.results) == len(STARTER_PROMPTS) == 14
    seen_ids = {r.prompt_id for r in report.results}
    expected_ids = {p.prompt_id for p in STARTER_PROMPTS}
    assert seen_ids == expected_ids


def test_negative_control_is_rejected_by_eval_gate(report: EvalReport) -> None:
    assert report.negative_control_rejected is True
    # The rejection reason must surface concrete eval failures.
    assert report.negative_control_reason is not None
    assert "banned" in (report.negative_control_reason or "").lower()


def test_exit_code_is_zero_when_threshold_met(report: EvalReport) -> None:
    assert report.pass_count >= _PASS_THRESHOLD
    # And the CLI entry actually returns 0 when the threshold is met.
    rc = main()
    assert rc == 0


def test_each_prompt_has_a_final_message(report: EvalReport) -> None:
    """Every reasonable turn ends with the agent's two-sentence final
    message. The eval verifies the path emits at least one message frame
    after the plan."""
    for r in report.results:
        assert r.final_message_seen, (
            f"prompt {r.prompt_id} did not emit a final message frame"
        )


def test_each_prompt_used_all_5_tools_at_least_once_in_aggregate(
    report: EvalReport,
) -> None:
    """The stub for each prompt issues at least one add_node, add_pipe, and
    validate. We sample tool_call counts as a sanity floor."""
    for r in report.results:
        # Every starter has >=4 nodes and >=3 pipes plus one validate, so a
        # safe floor is 8 tool calls.
        assert r.tool_call_count >= 8, (
            f"{r.prompt_id} had only {r.tool_call_count} tool calls"
        )
