"""Live eval harness for the Pipes builder agent.

Runs the same 14 starter prompts as `run_eval.py`, but against a real
deployed Modal endpoint instead of an in-process stub runner. Reads the
SSE stream byte-by-byte, captures the produced graph from `tool_result`
events, and scores each prompt against the canonical baseline graph.

Difference vs `run_eval.py`
---------------------------
- This module talks to HTTP. It never calls the in-process runner.
- It captures wall-clock latency per prompt and cold-start latency
  (time from POST send to first SSE byte) across the full set.
- Scoring re-uses helpers from `run_eval` so logic stays in one place.

Required environment
--------------------
- `PIPES_AGENT_ENDPOINT_URL` - the HTTPS URL of the Modal endpoint, e.g.
  `https://you--pipes-agent-serve-modal.modal.run`. The harness POSTs to
  `{URL}/build`, which is the path `agents/sandbox.py::_make_fastapi_app`
  registers.
- `OPENAI_API_KEY` - not used by the client (the Modal secret holds the
  real key), but its presence is checked here as a guardrail against
  accidental stub usage. If you want to bypass the check, set
  `PIPES_LIVE_EVAL_SKIP_KEY_CHECK=1`.

Exit codes
----------
- 0 if 12 of 14 prompts pass AND p95 cold-start < 1500 ms AND p95
  wall-clock < 30 s.
- 1 otherwise.
- 2 if `PIPES_AGENT_ENDPOINT_URL` is missing.

CLI
---
    PIPES_AGENT_ENDPOINT_URL=https://... OPENAI_API_KEY=sk-... \\
        python -m agents.eval.run_live_eval

    PIPES_AGENT_ENDPOINT_URL=https://... OPENAI_API_KEY=sk-... \\
        python agents/eval/run_live_eval.py
"""

from __future__ import annotations

import asyncio
import json
import math
import os
import statistics
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, AsyncIterator, Dict, List, Optional, Tuple

if TYPE_CHECKING:  # pragma: no cover - type-check only
    import httpx


def _import_httpx() -> Any:
    """Import httpx lazily.

    httpx is declared in `agents/requirements.txt` (>=0.27). Importing it
    at module top would break collection in sandboxes that have not yet
    installed the agent runtime deps. Importers that actually run the
    eval will install httpx; importers that only want the docstring will
    not.
    """
    import httpx as _httpx

    return _httpx


# Allow `python agents/eval/run_live_eval.py` to run from anywhere.
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from agents.eval.prompts import STARTER_PROMPTS, StarterPrompt  # noqa: E402
from agents.eval.run_eval import (  # noqa: E402
    ProducedGraph,
    PromptResult,
    _has_source_and_sink,
    _title_overlap,
    _BASELINE_PATH,
)


_REPORT_PATH = _REPO_ROOT / "docs" / "builder-live-eval.md"
_PASS_THRESHOLD = 12
_COLD_START_P95_BUDGET_MS = 1500.0
_WALL_CLOCK_P95_BUDGET_S = 30.0
_REQUEST_TIMEOUT_S = 90.0


# ---- HTTP helpers ----


def _endpoint_url() -> str:
    url = os.environ.get("PIPES_AGENT_ENDPOINT_URL", "").strip()
    if not url:
        print(
            "PIPES_AGENT_ENDPOINT_URL is not set. Cannot run the live eval. "
            "Deploy the Modal app (bash agents/deploy.sh), copy the printed "
            "URL, and re-run with that URL exported.",
            file=sys.stderr,
        )
        sys.exit(2)
    if url.endswith("/"):
        url = url[:-1]
    return url


def _check_openai_key() -> None:
    """Refuse to run if the operator probably forgot to set OPENAI_API_KEY.

    The client itself never sends the key over the wire (Modal injects it
    from the secret). The check exists so a missing key catches the
    operator before the eval silently runs against a misconfigured Modal
    deploy.
    """
    if os.environ.get("PIPES_LIVE_EVAL_SKIP_KEY_CHECK") == "1":
        return
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        print(
            "OPENAI_API_KEY is not set in this shell. The Modal endpoint "
            "uses its own copy from the pipes-agent-secrets secret, so the "
            "client never sends it; this check exists to catch the case "
            "where the secret was never created. Export OPENAI_API_KEY "
            "anyway, or set PIPES_LIVE_EVAL_SKIP_KEY_CHECK=1 to bypass.",
            file=sys.stderr,
        )
        sys.exit(2)


# ---- SSE byte-by-byte parser ----


async def _iter_sse_events(
    response: "httpx.Response",
) -> AsyncIterator[Tuple[str, Dict[str, Any]]]:
    """Yield (event_name, data_dict) tuples from an SSE response stream.

    Each frame is `event: <name>\\n` followed by `data: <json>\\n` and a
    blank line separator. We accumulate raw bytes and split on the
    double-newline boundary so we never trust the server's chunk size.
    """
    buffer = ""
    async for chunk in response.aiter_text():
        if not chunk:
            continue
        buffer += chunk
        while "\n\n" in buffer:
            frame, buffer = buffer.split("\n\n", 1)
            event_name = ""
            data_str = ""
            for line in frame.split("\n"):
                if line.startswith("event: "):
                    event_name = line[len("event: ") :].strip()
                elif line.startswith("data: "):
                    data_str = line[len("data: ") :]
            if not event_name and not data_str:
                continue
            try:
                data = json.loads(data_str) if data_str else {}
            except json.JSONDecodeError:
                data = {"_unparsed": data_str}
            yield event_name, data


# ---- Live trace ----


@dataclass
class LiveTrace:
    """Everything captured during one live turn."""

    prompt_id: str
    events: List[Tuple[str, Dict[str, Any]]] = field(default_factory=list)
    cold_start_ms: float = 0.0
    wall_clock_s: float = 0.0
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    transport_error: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None

    def graph(self) -> ProducedGraph:
        g = ProducedGraph()
        for name, data in self.events:
            if name != "tool_result":
                continue
            action = data.get("action") or {}
            kind = action.get("action")
            if kind == "addNode":
                nid = action.get("clientNodeId") or action.get("nodeId") or ""
                g.nodes.append(action)
                g.title_by_id[nid] = action.get("title", "")
            elif kind == "addPipe":
                g.pipes.append(action)
        return g


# ---- The single live turn ----


async def run_one_live(
    prompt: StarterPrompt,
    endpoint_url: str,
    *,
    client: "Optional[httpx.AsyncClient]" = None,
    timeout_s: float = _REQUEST_TIMEOUT_S,
) -> LiveTrace:
    """POST one prompt, read the SSE stream, return the captured trace."""
    httpx_mod = _import_httpx()
    trace = LiveTrace(prompt_id=prompt.prompt_id)
    payload = {
        "systemId": f"sys_live_{prompt.prompt_id}",
        "prompt": prompt.text,
    }
    own_client = client is None
    if client is None:
        client = httpx_mod.AsyncClient(timeout=timeout_s)

    started = time.perf_counter()
    first_byte_at: Optional[float] = None
    try:
        async with client.stream(
            "POST",
            f"{endpoint_url}/build",
            json=payload,
            headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
        ) as response:
            if response.status_code != 200:
                body = await response.aread()
                trace.transport_error = (
                    f"HTTP {response.status_code}: {body.decode('utf-8', errors='replace')[:200]}"
                )
                return trace
            async for name, data in _iter_sse_events(response):
                if first_byte_at is None:
                    first_byte_at = time.perf_counter()
                trace.events.append((name, data))
                if name == "error":
                    trace.error_code = data.get("code")
                    trace.error_message = data.get("message")
                if name == "usage":
                    # Optional v2 event. Documented in the production
                    # checklist as a future addition.
                    trace.usage = data
    except httpx_mod.HTTPError as exc:
        trace.transport_error = f"{type(exc).__name__}: {exc}"
    finally:
        if own_client:
            await client.aclose()

    completed = time.perf_counter()
    if first_byte_at is not None:
        trace.cold_start_ms = (first_byte_at - started) * 1000.0
    trace.wall_clock_s = completed - started
    return trace


# ---- Scoring ----


def _score_live(
    prompt: StarterPrompt,
    trace: LiveTrace,
    baseline: Dict[str, Any],
) -> PromptResult:
    """Mirrors `run_eval._score`, with transport-error handling added."""
    graph = trace.graph()
    baseline_node_titles: List[str] = list(baseline.get("node_titles", []))
    baseline_pipes: List[List[str]] = list(baseline.get("pipes", []))

    produced_titles = [
        graph.title_by_id.get(n.get("clientNodeId", "") or n.get("nodeId", ""), "")
        for n in graph.nodes
    ]
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
    if trace.transport_error:
        reasons.append(f"transport error: {trace.transport_error}")
    if trace.error_code:
        reasons.append(f"agent error: {trace.error_code} ({trace.error_message or ''})")
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
        and trace.transport_error is None
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


# ---- Top-level driver ----


@dataclass
class LiveEvalReport:
    results: List[PromptResult]
    traces: List[LiveTrace]
    cold_start_ms: List[float]
    wall_clock_s: List[float]
    transport_error_count: int
    agent_error_count: int

    @property
    def pass_count(self) -> int:
        return sum(1 for r in self.results if r.overall_pass)

    @property
    def total(self) -> int:
        return len(self.results)

    @property
    def cold_start_p50_ms(self) -> float:
        return _percentile(self.cold_start_ms, 50.0)

    @property
    def cold_start_p95_ms(self) -> float:
        return _percentile(self.cold_start_ms, 95.0)

    @property
    def wall_clock_p50_s(self) -> float:
        return _percentile(self.wall_clock_s, 50.0)

    @property
    def wall_clock_p95_s(self) -> float:
        return _percentile(self.wall_clock_s, 95.0)

    def passes_thresholds(self) -> bool:
        return (
            self.pass_count >= _PASS_THRESHOLD
            and self.cold_start_p95_ms < _COLD_START_P95_BUDGET_MS
            and self.wall_clock_p95_s < _WALL_CLOCK_P95_BUDGET_S
        )


def _percentile(xs: List[float], p: float) -> float:
    if not xs:
        return 0.0
    if len(xs) == 1:
        return float(xs[0])
    sorted_xs = sorted(xs)
    k = (len(sorted_xs) - 1) * (p / 100.0)
    lo = math.floor(k)
    hi = math.ceil(k)
    if lo == hi:
        return float(sorted_xs[int(k)])
    return float(sorted_xs[lo] + (sorted_xs[hi] - sorted_xs[lo]) * (k - lo))


def _load_baselines() -> Dict[str, Dict[str, Any]]:
    return json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))


async def run_live_eval(
    *,
    endpoint_url: Optional[str] = None,
    prompts: Optional[Tuple[StarterPrompt, ...]] = None,
) -> LiveEvalReport:
    """Run all (or a subset of) starter prompts against a live endpoint."""
    if endpoint_url is None:
        endpoint_url = _endpoint_url()
    baselines = _load_baselines()
    selected = prompts if prompts is not None else STARTER_PROMPTS

    results: List[PromptResult] = []
    traces: List[LiveTrace] = []
    cold_starts: List[float] = []
    wall_clocks: List[float] = []
    transport_errors = 0
    agent_errors = 0

    httpx_mod = _import_httpx()
    async with httpx_mod.AsyncClient(timeout=_REQUEST_TIMEOUT_S) as client:
        for prompt in selected:
            trace = await run_one_live(prompt, endpoint_url, client=client)
            traces.append(trace)
            if trace.transport_error:
                transport_errors += 1
            if trace.error_code:
                agent_errors += 1
            if trace.cold_start_ms > 0:
                cold_starts.append(trace.cold_start_ms)
            wall_clocks.append(trace.wall_clock_s)
            baseline = baselines.get(prompt.prompt_id, {})
            results.append(_score_live(prompt, trace, baseline))

    return LiveEvalReport(
        results=results,
        traces=traces,
        cold_start_ms=cold_starts,
        wall_clock_s=wall_clocks,
        transport_error_count=transport_errors,
        agent_error_count=agent_errors,
    )


# ---- Output ----


def _print_summary(report: LiveEvalReport) -> None:
    print("=" * 96)
    print("Builder live eval - per-prompt verdicts")
    print("=" * 96)
    for r, trace in zip(report.results, report.traces):
        verdict = "PASS" if r.overall_pass else "FAIL"
        reasons = "; ".join(r.failure_reasons) if r.failure_reasons else "-"
        print(
            f"{r.prompt_id:<32} {verdict:<5} "
            f"nodes={r.produced_node_count}/{r.baseline_node_count} "
            f"pipes={r.produced_pipe_count}/{r.baseline_pipe_count} "
            f"overlap={r.title_overlap_score:.2f} "
            f"cold={trace.cold_start_ms:.0f}ms "
            f"wall={trace.wall_clock_s:.1f}s "
            f"reasons={reasons}"
        )
    print("-" * 96)
    print(
        f"Pass: {report.pass_count} / {report.total}  "
        f"(threshold {_PASS_THRESHOLD})"
    )
    print(
        f"Cold start: p50={report.cold_start_p50_ms:.0f} ms, "
        f"p95={report.cold_start_p95_ms:.0f} ms "
        f"(budget p95 < {_COLD_START_P95_BUDGET_MS:.0f} ms)"
    )
    print(
        f"Wall clock: p50={report.wall_clock_p50_s:.1f} s, "
        f"p95={report.wall_clock_p95_s:.1f} s "
        f"(budget p95 < {_WALL_CLOCK_P95_BUDGET_S:.1f} s)"
    )
    print(
        f"Transport errors: {report.transport_error_count}, "
        f"agent errors: {report.agent_error_count}"
    )
    print("=" * 96)


def _mean(xs: List[float]) -> float:
    return statistics.fmean(xs) if xs else 0.0


def _write_report(report: LiveEvalReport) -> None:
    rows: List[str] = []
    rows.append("# Builder live eval - production telemetry report")
    rows.append("")
    rows.append(
        "Headline: Describe your system. Watch it build itself. This report "
        "captures one full pass over the 14 starter prompts against a real "
        "Modal-hosted agent endpoint with a real OpenAI key. The stub-driven "
        "verdict in `docs/builder-eval.md` proves the plumbing; this report "
        "proves the live runner."
    )
    rows.append("")
    rows.append("## Method")
    rows.append("")
    rows.append(
        "Each prompt is POSTed to `${PIPES_AGENT_ENDPOINT_URL}/build` with a "
        "`BuildRequest` JSON body. The response is a `text/event-stream`. "
        "The harness reads bytes off the wire, splits on `\\n\\n` frame "
        "boundaries, and parses each `event:` and `data:` line. Tool "
        "results are accumulated into a produced graph and scored against "
        "`baseline_graphs.json` using the same helpers as `run_eval.py` "
        "(`_title_overlap`, `_has_source_and_sink`)."
    )
    rows.append("")
    rows.append(
        "Pass criteria per prompt: node count within +/-2 of baseline, pipe "
        "count within +/-2, title overlap >= 0.50, connectivity (>=1 source "
        "and >=1 sink), no `error` event, and no transport failure. The "
        "ship gate is 12 of 14 PASS plus p95 cold start < "
        f"{_COLD_START_P95_BUDGET_MS:.0f} ms plus p95 wall clock < "
        f"{_WALL_CLOCK_P95_BUDGET_S:.0f} s."
    )
    rows.append("")
    rows.append("## Results table")
    rows.append("")
    rows.append(
        "| Prompt id | Verdict | Nodes (got/expected) | Pipes (got/expected) | "
        "Title overlap | Cold start (ms) | Wall clock (s) | Notes |"
    )
    rows.append(
        "|-----------|---------|---------------------|---------------------|"
        "---------------|-----------------|---------------|-------|"
    )
    for r, trace in zip(report.results, report.traces):
        verdict = "PASS" if r.overall_pass else "FAIL"
        notes = "; ".join(r.failure_reasons) if r.failure_reasons else "-"
        rows.append(
            f"| {r.prompt_id} | {verdict} | "
            f"{r.produced_node_count}/{r.baseline_node_count} | "
            f"{r.produced_pipe_count}/{r.baseline_pipe_count} | "
            f"{r.title_overlap_score:.2f} | "
            f"{trace.cold_start_ms:.0f} | "
            f"{trace.wall_clock_s:.1f} | {notes} |"
        )
    rows.append("")
    rows.append("## Production telemetry")
    rows.append("")
    rows.append(f"- Cold start p50: {report.cold_start_p50_ms:.0f} ms")
    rows.append(f"- Cold start p95: {report.cold_start_p95_ms:.0f} ms")
    rows.append(f"- Wall clock p50: {report.wall_clock_p50_s:.1f} s")
    rows.append(f"- Wall clock p95: {report.wall_clock_p95_s:.1f} s")
    rows.append(f"- Transport errors: {report.transport_error_count}")
    rows.append(f"- Agent error events: {report.agent_error_count}")
    rows.append("")
    rows.append(
        "Token usage is NOT recorded here. The agent runner does not yet "
        "emit a `usage` SSE event; that is a Phase 4 follow-up listed in "
        "`agents/README.md` under \"Status of the open questions\". Once "
        "the SDK exposes consistent input/output token counts on streamed "
        "tool calls, this report will gain a per-prompt token column."
    )
    rows.append("")
    rows.append("## Aggregate")
    rows.append("")
    rows.append(f"- Pass: {report.pass_count} / {report.total}")
    overlap_mean = _mean([r.title_overlap_score for r in report.results])
    tool_calls_mean = _mean([float(r.tool_call_count) for r in report.results])
    rows.append(f"- Title overlap mean: {overlap_mean:.2f}")
    rows.append(f"- Average tool calls per turn: {tool_calls_mean:.1f}")
    rows.append("")
    rows.append("## Verdict")
    rows.append("")
    if report.passes_thresholds():
        rows.append(
            f"{report.pass_count} of {report.total} prompts pass against the "
            "live endpoint and both latency budgets are met. The agent-"
            "driven front door is shippable. Proceed to step 6 of "
            "`docs/production-checklist.md`."
        )
    else:
        failed = [r.prompt_id for r in report.results if not r.overall_pass]
        rows.append(
            f"Only {report.pass_count} of {report.total} prompts passed. "
            f"Failures: {', '.join(failed) if failed else 'none'}. Cold "
            f"start p95 = {report.cold_start_p95_ms:.0f} ms (budget "
            f"{_COLD_START_P95_BUDGET_MS:.0f}). Wall clock p95 = "
            f"{report.wall_clock_p95_s:.1f} s (budget "
            f"{_WALL_CLOCK_P95_BUDGET_S:.1f}). Investigate the failing "
            "prompts before flipping the production switch."
        )
    rows.append("")
    rows.append("## What this eval does NOT cover")
    rows.append("")
    rows.append(
        "- Concurrent multi-tab turns. The harness is sequential by design "
        "to keep per-prompt latency clean."
    )
    rows.append(
        "- Cost telemetry (token counts, dollar cost). See note above."
    )
    rows.append(
        "- Cancellation and abort behavior. The contract covers it; a "
        "follow-up live test will exercise it once the production route "
        "wires `request.signal.aborted` end to end."
    )
    rows.append("")

    _REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    _REPORT_PATH.write_text("\n".join(rows), encoding="utf-8")


# ---- CLI ----


def main() -> int:
    _check_openai_key()
    endpoint_url = _endpoint_url()
    report = asyncio.run(run_live_eval(endpoint_url=endpoint_url))
    _print_summary(report)
    _write_report(report)
    if report.passes_thresholds():
        return 0
    print(
        "Live eval failed thresholds. See "
        f"{_REPORT_PATH.relative_to(_REPO_ROOT)} for details.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
