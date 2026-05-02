"""Modal app that hosts the agent runner.

One HTTPS endpoint, `serve`, accepts a JSON BuildRequest and streams
text/event-stream frames per docs/agent-contract.md.

Cold-start budget: 800 ms before the first byte. To stay inside that budget we
keep module-level work to a minimum:
  * No model client instantiation here.
  * No env-var reads at import time besides the Modal image declaration.
  * The OpenAI Agents SDK is imported lazily inside builder.run_turn_stream.

Run locally:
    modal run agents/sandbox.py::serve --local --prompt "Planner agent feeds a Coder agent."

Deploy:
    modal deploy agents/sandbox.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any, AsyncIterator

# Modal is not present in unit-test environments. Allow import to fail
# gracefully so `pytest` still loads this module if it ever needs to.
try:
    import modal  # type: ignore[import-not-found]
except Exception:  # noqa: BLE001
    modal = None  # type: ignore[assignment]


APP_NAME = "pipes-agent"
SECRET_NAME = "pipes-agent-secrets"


def _build_image() -> Any:
    """Construct the Modal image. Pinned mirror of requirements.txt."""
    if modal is None:
        return None
    return (
        modal.Image.debian_slim(python_version="3.11")
        .pip_install(
            "openai-agents>=0.0.18",
            "openai>=1.40.0",
            "pydantic>=2.0",
            "httpx>=0.27",
            "sse-starlette>=2.1",
            "fastapi>=0.115",
        )
        .add_local_python_source("agents")
    )


# Define the Modal App at module scope so `modal deploy` discovers it. If Modal
# is not installed, expose a no-op shim so `python -c "import sandbox"` works.
if modal is not None:
    app = modal.App(APP_NAME, image=_build_image())
else:
    app = None  # type: ignore[assignment]


# ---- The streaming endpoint ----


async def _stream_for_request(body: dict[str, Any]) -> AsyncIterator[bytes]:
    """Translate a BuildRequest dict into a stream of SSE bytes.

    `body` may include the optional tailoring fields documented in
    `agents/README.md` (userFirstName, userTeam, priorSystemsSummary,
    systemName, existingNodesCount, existingPipesCount). The Pydantic model
    accepts both camelCase aliases (from the Next.js route) and snake_case
    field names. Unknown fields are ignored.
    """
    # Lazy import so tests can load this module without the rest of the package
    # resolving. Modal containers will resolve once the image boots.
    from .builder import run_turn_stream
    from .schemas import BuildRequest

    request = BuildRequest.model_validate(body)
    async for frame in run_turn_stream(request):
        yield frame.encode("utf-8")


def _make_fastapi_app() -> Any:
    """Build the FastAPI app. Lazy so unit tests can skip FastAPI install."""
    from fastapi import FastAPI, Request  # type: ignore[import-not-found]
    from sse_starlette.sse import EventSourceResponse  # type: ignore[import-not-found]
    from starlette.responses import StreamingResponse  # type: ignore[import-not-found]

    api = FastAPI(title="Pipes Agent Runner")

    @api.post("/build")
    async def build(request: Request) -> Any:  # noqa: ARG001
        body = await request.json()

        async def event_stream() -> AsyncIterator[bytes]:
            async for chunk in _stream_for_request(body):
                if await request.is_disconnected():
                    return
                yield chunk

        # We frame our own SSE bytes (event:/data: lines) inside builder. Use
        # StreamingResponse rather than EventSourceResponse so we keep one
        # framing layer.
        _ = EventSourceResponse  # keep import to surface install issues early
        return StreamingResponse(event_stream(), media_type="text/event-stream")

    return api


if modal is not None:
    @app.function(
        secrets=[modal.Secret.from_name(SECRET_NAME)],
        timeout=120,
    )
    @modal.asgi_app()
    def serve_modal() -> Any:
        return _make_fastapi_app()


# ---- Local one-shot entrypoint ----


async def _run_local(prompt: str, system_id: str = "sys_local") -> None:
    """Run a single turn against the live OpenAI API and print SSE frames to stdout.

    Useful for `modal run agents/sandbox.py::serve --local` and for hand-testing
    without a Modal deploy.
    """
    from .builder import run_turn_stream
    from .schemas import BuildRequest

    request = BuildRequest(systemId=system_id, prompt=prompt)
    async for frame in run_turn_stream(request):
        sys.stdout.write(frame)
        sys.stdout.flush()


def serve(local: bool = False, prompt: str = "", system_id: str = "sys_local") -> None:
    """CLI wrapper invoked by `modal run agents/sandbox.py::serve`.

    Pass --local to bypass Modal and run a single turn in this Python process.
    """
    if local:
        if not prompt:
            print(
                "Pass --prompt 'your sentence' to run locally.",
                file=sys.stderr,
            )
            sys.exit(2)
        if not os.environ.get("OPENAI_API_KEY"):
            print(
                "OPENAI_API_KEY is not set. Export it before running --local.",
                file=sys.stderr,
            )
            sys.exit(2)
        asyncio.run(_run_local(prompt=prompt, system_id=system_id))
        return
    print(
        "Run `modal deploy agents/sandbox.py` to expose the HTTPS endpoint, "
        "or pass --local to run one turn in this process.",
        file=sys.stderr,
    )


# When Modal invokes `serve`, it expects a callable. Decorate at registration
# time only if Modal is available; tests import the plain function.
if modal is not None:
    serve = app.local_entrypoint()(serve)  # type: ignore[assignment]


# Streaming demo helper for ad-hoc debugging.
async def _demo() -> None:
    body = {"systemId": "sys_demo", "prompt": "Planner agent feeds a Coder agent."}
    async for chunk in _stream_for_request(body):
        sys.stdout.write(chunk.decode("utf-8"))


if __name__ == "__main__":
    if "--demo" in sys.argv:
        asyncio.run(_demo())
    else:
        # Default to the CLI surface so `python -m agents.sandbox --local --prompt ...`
        # behaves consistently with `modal run`.
        local_flag = "--local" in sys.argv
        prompt_value = ""
        for i, arg in enumerate(sys.argv):
            if arg == "--prompt" and i + 1 < len(sys.argv):
                prompt_value = sys.argv[i + 1]
        serve(local=local_flag, prompt=prompt_value)


# Re-export the SSE framer for tests to introspect bytes without importing modal.
def _serialize_event(name: str, data: dict[str, Any]) -> bytes:
    return f"event: {name}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n".encode("utf-8")
