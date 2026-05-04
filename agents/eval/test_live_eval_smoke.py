"""Smoke test for the live eval harness.

Skips by default. Runs only when `PIPES_AGENT_ENDPOINT_URL` is set so
CI never fails on the absence of a live endpoint. When the env var is
present, this test runs three of the 14 starter prompts against the
real endpoint and asserts:

- No transport error per prompt.
- Each turn ends with the agent's final message.
- Cold-start latency is captured (>0 ms).

The test exists to catch the case where the production endpoint
returns 404, returns plain JSON instead of SSE, or hangs before the
first byte. It is NOT a substitute for the full
`agents/eval/run_live_eval.py` run, which writes the production
telemetry report to `docs/builder-live-eval.md`.

Run:
    PIPES_AGENT_ENDPOINT_URL=https://... pytest agents/eval/test_live_eval_smoke.py -v
"""

from __future__ import annotations

import asyncio
import os

import pytest


LIVE_URL = os.environ.get("PIPES_AGENT_ENDPOINT_URL", "").strip()


@pytest.mark.skipif(
    not LIVE_URL,
    reason="No PIPES_AGENT_ENDPOINT_URL set; skipping live eval smoke test",
)
def test_live_eval_runs_at_least_three_prompts() -> None:
    """Smoke test: 3 prompts, real endpoint, must complete with no errors."""
    # Imports are deferred so collection does not require httpx in sandboxes
    # where the agent runtime deps are not installed.
    from agents.eval.prompts import STARTER_PROMPTS
    from agents.eval.run_live_eval import run_one_live

    endpoint_url = LIVE_URL.rstrip("/")
    sample = STARTER_PROMPTS[:3]

    async def _run() -> None:
        for prompt in sample:
            trace = await run_one_live(prompt, endpoint_url)
            assert trace.transport_error is None, (
                f"transport error for {prompt.prompt_id}: {trace.transport_error}"
            )
            assert trace.error_code is None, (
                f"agent error for {prompt.prompt_id}: "
                f"{trace.error_code} ({trace.error_message})"
            )
            assert trace.cold_start_ms > 0, (
                f"no first-byte timing captured for {prompt.prompt_id}"
            )
            assert any(
                name == "message" for name, _ in trace.events
            ), f"{prompt.prompt_id} produced zero message events"

    asyncio.run(_run())
