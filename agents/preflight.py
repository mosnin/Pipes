"""Preflight checks for `bash agents/deploy.sh`.

Run this BEFORE any Modal deploy. Exits 0 only when every prerequisite
is satisfied. On any failure, exits with a numeric code in the table
below and prints a one-line, fix-this message naming the missing piece.

The check order is "cheapest first, network last" so an operator who
forgot to set an env var does not pay for a remote round-trip before
seeing the error.

Exit-code matrix
----------------
    0   All checks passed.
   10   Python version too old (need 3.11+).
   11   One or more required env vars missing.
   12   A required Python dependency cannot be imported.
   13   `modal token list` failed (CLI not authenticated).
   14   OpenAI API rejected the key (HTTP 401).
   15   OpenAI API check could not reach the network.
   16   The Modal secret `pipes-agent-secrets` is missing.

Usage
-----
    python agents/preflight.py

The script never deploys anything. It only validates. The deploy
script (`agents/deploy.sh`) calls this as Step 0; you may also run it
by hand any time to confirm the workstation is ready.
"""

from __future__ import annotations

import importlib
import os
import shutil
import subprocess
import sys
from typing import List, Tuple


# ---- Exit codes ----

EXIT_OK = 0
EXIT_PYTHON_VERSION = 10
EXIT_MISSING_ENV = 11
EXIT_MISSING_DEP = 12
EXIT_MODAL_AUTH = 13
EXIT_OPENAI_REJECTED = 14
EXIT_OPENAI_NETWORK = 15
EXIT_MODAL_SECRET = 16


# ---- Required inputs ----

REQUIRED_ENV_VARS: Tuple[str, ...] = (
    "OPENAI_API_KEY",
    "MODAL_TOKEN_ID",
    "MODAL_TOKEN_SECRET",
)

# Each entry is (import_name, pip_install_name). The OpenAI Agents SDK
# ships on PyPI as `openai-agents` but imports as `agents`, which would
# collide with this package. We probe via importlib using the SDK's
# inner module path, which is unique to the SDK and not shadowed by
# this folder.
REQUIRED_DEPS: Tuple[Tuple[str, str], ...] = (
    ("modal", "modal"),
    ("openai", "openai"),
    ("agents.tool", "openai-agents"),
    ("pydantic", "pydantic"),
    ("httpx", "httpx"),
    ("fastapi", "fastapi"),
    ("sse_starlette", "sse-starlette"),
)

MODAL_SECRET_NAME = "pipes-agent-secrets"


# ---- Console helpers ----


def _ok(msg: str) -> None:
    print(f"  ok    {msg}")


def _fail(msg: str) -> None:
    print(f"  fail  {msg}", file=sys.stderr)


def _warn(msg: str) -> None:
    print(f"  warn  {msg}")


def _step(label: str) -> None:
    print(f"==> {label}")


# ---- Individual checks ----


def check_python_version() -> int:
    _step("Python version")
    if sys.version_info < (3, 11):
        _fail(
            f"Python {sys.version_info.major}.{sys.version_info.minor} "
            "is too old. Install Python 3.11 or newer and re-run."
        )
        return EXIT_PYTHON_VERSION
    _ok(f"Python {sys.version_info.major}.{sys.version_info.minor}")
    return EXIT_OK


def check_required_env_vars() -> int:
    _step("Required env vars")
    missing: List[str] = []
    for name in REQUIRED_ENV_VARS:
        value = os.environ.get(name, "").strip()
        if not value:
            _fail(f"{name} is not set or empty")
            missing.append(name)
        else:
            _ok(f"{name} present")
    if missing:
        _fail(
            "Set the missing vars and re-run. "
            "See docs/production-checklist.md, Step 2."
        )
        return EXIT_MISSING_ENV
    return EXIT_OK


def check_required_deps() -> int:
    _step("Required Python deps importable")
    missing_pkgs: List[str] = []
    for module_name, pip_name in REQUIRED_DEPS:
        try:
            importlib.import_module(module_name)
        except Exception as exc:  # noqa: BLE001
            _fail(f"cannot import {module_name}: {exc}")
            missing_pkgs.append(pip_name)
        else:
            _ok(f"{module_name}")
    if missing_pkgs:
        unique = sorted(set(missing_pkgs))
        _fail(
            "Install missing packages with: "
            f"pip install {' '.join(unique)}"
        )
        return EXIT_MISSING_DEP
    return EXIT_OK


def check_modal_cli_auth() -> int:
    _step("Modal CLI auth")
    modal_bin = shutil.which("modal")
    if modal_bin is None:
        _fail(
            "modal CLI not found on PATH. Run: pip install modal && modal token new"
        )
        return EXIT_MODAL_AUTH
    try:
        result = subprocess.run(
            [modal_bin, "token", "list"],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        _fail("`modal token list` timed out after 15s")
        return EXIT_MODAL_AUTH
    except OSError as exc:
        _fail(f"could not invoke modal CLI: {exc}")
        return EXIT_MODAL_AUTH
    if result.returncode != 0:
        stderr = (result.stderr or result.stdout or "").strip()
        _fail(
            "`modal token list` failed. Run `modal token new` to authenticate. "
            f"Detail: {stderr.splitlines()[0] if stderr else 'no detail'}"
        )
        return EXIT_MODAL_AUTH
    _ok("modal CLI authenticated")
    return EXIT_OK


def check_openai_key_sanity() -> int:
    _step("OpenAI key sanity")
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        # Already caught by check_required_env_vars; treat as rejected
        # so this check is independently meaningful.
        _fail("OPENAI_API_KEY is empty")
        return EXIT_OPENAI_REJECTED
    try:
        import httpx  # noqa: WPS433 - import here so missing-dep check runs first
    except Exception as exc:  # noqa: BLE001
        _fail(f"httpx not importable: {exc}")
        return EXIT_OPENAI_NETWORK
    try:
        response = httpx.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5.0,
        )
    except Exception as exc:  # noqa: BLE001
        _fail(
            "could not reach https://api.openai.com/v1/models. "
            f"Network error: {type(exc).__name__}: {exc}"
        )
        return EXIT_OPENAI_NETWORK
    if response.status_code == 401:
        _fail("OPENAI_API_KEY rejected by api.openai.com (HTTP 401)")
        return EXIT_OPENAI_REJECTED
    if response.status_code != 200:
        _warn(
            f"OpenAI returned HTTP {response.status_code}. "
            "Treating as transient and continuing."
        )
        return EXIT_OK
    _ok("OPENAI_API_KEY accepted by api.openai.com")
    return EXIT_OK


def check_modal_secret_exists() -> int:
    _step(f"Modal secret `{MODAL_SECRET_NAME}` exists")
    modal_bin = shutil.which("modal")
    if modal_bin is None:
        # The auth check already flagged this; surface a useful code here too.
        _fail("modal CLI not found on PATH")
        return EXIT_MODAL_SECRET
    try:
        result = subprocess.run(
            [modal_bin, "secret", "list"],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        _fail("`modal secret list` timed out after 15s")
        return EXIT_MODAL_SECRET
    except OSError as exc:
        _fail(f"could not invoke modal CLI: {exc}")
        return EXIT_MODAL_SECRET
    if result.returncode != 0:
        stderr = (result.stderr or result.stdout or "").strip()
        _fail(
            "`modal secret list` failed. "
            f"Detail: {stderr.splitlines()[0] if stderr else 'no detail'}"
        )
        return EXIT_MODAL_SECRET
    output = result.stdout or ""
    if MODAL_SECRET_NAME not in output:
        _fail(
            f"Modal secret `{MODAL_SECRET_NAME}` not found. "
            "Create it with: "
            f"modal secret create {MODAL_SECRET_NAME} OPENAI_API_KEY=sk-..."
        )
        return EXIT_MODAL_SECRET
    _ok(f"`{MODAL_SECRET_NAME}` present")
    return EXIT_OK


def check_repo_state() -> int:
    """Warn-only checks. Never fails; only prints diagnostics."""
    _step("Repository state (advisory)")
    git_bin = shutil.which("git")
    if git_bin is None:
        _warn("git not found on PATH; skipping repo-state checks")
        return EXIT_OK

    try:
        status = subprocess.run(
            [git_bin, "status", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception as exc:  # noqa: BLE001
        _warn(f"could not run `git status`: {exc}")
        return EXIT_OK
    if status.returncode == 0 and status.stdout.strip():
        _warn(
            "uncommitted changes in the working tree. "
            "Deploys should usually go from a clean checkout."
        )
    elif status.returncode == 0:
        _ok("working tree clean")

    try:
        branch = subprocess.run(
            [git_bin, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception as exc:  # noqa: BLE001
        _warn(f"could not read current branch: {exc}")
        return EXIT_OK
    if branch.returncode == 0:
        current = branch.stdout.strip()
        allowed = {"main", "claude/enterprise-ui-redesign-KLR64"}
        if current not in allowed:
            _warn(
                f"on branch `{current}`. Production deploys usually go "
                "from `main`."
            )
        else:
            _ok(f"branch `{current}`")
    return EXIT_OK


# ---- Driver ----


# Order matters: cheap, deterministic checks first; network last; the
# advisory git check at the end so a clean preflight ends with an
# encouraging line.
CHECKS: Tuple = (
    check_python_version,
    check_required_env_vars,
    check_required_deps,
    check_modal_cli_auth,
    check_openai_key_sanity,
    check_modal_secret_exists,
    check_repo_state,
)


def run_all_checks() -> int:
    for check in CHECKS:
        code = check()
        if code != EXIT_OK:
            print()
            print(
                f"Preflight FAILED at `{check.__name__}` (exit {code}). "
                "Address the message above and re-run "
                "`python agents/preflight.py`.",
                file=sys.stderr,
            )
            return code
    print()
    print("All preflight checks passed.")
    return EXIT_OK


def main() -> int:
    print("Pipes agent runner - preflight")
    print()
    return run_all_checks()


if __name__ == "__main__":
    sys.exit(main())
