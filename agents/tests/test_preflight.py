"""Unit tests for `agents/preflight.py`.

Each test patches the env, the module-import probe, and the
subprocess + httpx surfaces so the real network is never touched. The
tests exercise the matrix documented in `agents/preflight.py`:

    EXIT_OK              0  - happy path
    EXIT_MISSING_ENV    11  - one of OPENAI_API_KEY / MODAL_TOKEN_ID /
                              MODAL_TOKEN_SECRET missing
    EXIT_MISSING_DEP    12  - one of the import probes raises
    EXIT_MODAL_AUTH     13  - `modal token list` returns non-zero
    EXIT_OPENAI_REJECTED 14 - api.openai.com returns HTTP 401
    EXIT_MODAL_SECRET   16  - `modal secret list` does not contain the
                              `pipes-agent-secrets` line
"""

from __future__ import annotations

import importlib
import subprocess
from typing import Any

import pytest

from agents import preflight


# ---- Helpers ----


def _all_env_present(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("MODAL_TOKEN_ID", "tid_test")
    monkeypatch.setenv("MODAL_TOKEN_SECRET", "tsec_test")


class _FakeCompleted:
    def __init__(self, returncode: int = 0, stdout: str = "", stderr: str = "") -> None:
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


class _FakeResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


def _patch_modal_bin(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pretend `modal` exists on PATH so shutil.which returns a path."""
    monkeypatch.setattr(preflight.shutil, "which", lambda name: "/usr/local/bin/modal")


def _patch_git_bin(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pretend `git` is missing so the advisory check is a no-op."""
    real_which = preflight.shutil.which

    def fake_which(name: str) -> Any:
        if name == "modal":
            return "/usr/local/bin/modal"
        if name == "git":
            return None
        return real_which(name)

    monkeypatch.setattr(preflight.shutil, "which", fake_which)


def _patch_imports_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make every required-deps probe succeed."""
    monkeypatch.setattr(
        preflight.importlib,
        "import_module",
        lambda name: object(),
    )


def _build_subprocess_run(
    *,
    token_list_returncode: int = 0,
    secret_list_stdout: str = "Name                  Last used    Created\npipes-agent-secrets   never        a few seconds ago\n",
    secret_list_returncode: int = 0,
):
    """Return a fake `subprocess.run` that matches on argv shape."""

    def _fake_run(argv, capture_output=True, text=True, timeout=None):  # type: ignore[no-untyped-def]
        if argv[1:] == ["token", "list"]:
            return _FakeCompleted(
                returncode=token_list_returncode,
                stdout="Token Id      Last used\ntid_test      now\n",
                stderr="" if token_list_returncode == 0 else "auth failure",
            )
        if argv[1:] == ["secret", "list"]:
            return _FakeCompleted(
                returncode=secret_list_returncode,
                stdout=secret_list_stdout,
            )
        # The advisory git check might also call subprocess.run when git
        # is on PATH; we patch shutil.which to None to skip git, so this
        # branch should not be hit. Default to a clean result anyway.
        return _FakeCompleted(returncode=0, stdout="", stderr="")

    return _fake_run


def _patch_httpx_get(monkeypatch: pytest.MonkeyPatch, status_code: int) -> None:
    """Inject a fake `httpx` module whose `get` returns the given status.

    The preflight script imports `httpx` lazily inside the OpenAI check,
    so we install a stub into `sys.modules` before that import runs.
    This means the test never needs httpx actually installed.
    """
    import sys
    import types

    fake_module = types.ModuleType("httpx")

    def _fake_get(url, headers=None, timeout=None):  # type: ignore[no-untyped-def]
        return _FakeResponse(status_code=status_code)

    fake_module.get = _fake_get  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "httpx", fake_module)


# ---- Happy path ----


def test_all_checks_pass(monkeypatch: pytest.MonkeyPatch) -> None:
    _all_env_present(monkeypatch)
    _patch_git_bin(monkeypatch)  # also covers modal
    _patch_imports_ok(monkeypatch)
    monkeypatch.setattr(
        preflight.subprocess, "run", _build_subprocess_run()
    )
    _patch_httpx_get(monkeypatch, 200)

    assert preflight.run_all_checks() == preflight.EXIT_OK


# ---- Missing env vars ----


def test_missing_openai_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("MODAL_TOKEN_ID", "tid")
    monkeypatch.setenv("MODAL_TOKEN_SECRET", "tsec")
    _patch_git_bin(monkeypatch)
    _patch_imports_ok(monkeypatch)

    assert preflight.run_all_checks() == preflight.EXIT_MISSING_ENV


def test_missing_modal_token_id(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.delenv("MODAL_TOKEN_ID", raising=False)
    monkeypatch.setenv("MODAL_TOKEN_SECRET", "tsec")
    _patch_git_bin(monkeypatch)
    _patch_imports_ok(monkeypatch)

    assert preflight.run_all_checks() == preflight.EXIT_MISSING_ENV


# ---- Missing dep ----


def test_missing_modal_dep(monkeypatch: pytest.MonkeyPatch) -> None:
    _all_env_present(monkeypatch)
    _patch_git_bin(monkeypatch)

    real_import = importlib.import_module

    def fake_import(name: str) -> Any:
        if name == "modal":
            raise ModuleNotFoundError("No module named 'modal'")
        return object()

    monkeypatch.setattr(preflight.importlib, "import_module", fake_import)

    assert preflight.run_all_checks() == preflight.EXIT_MISSING_DEP

    # Reference real_import to keep the closure import live for clarity.
    assert callable(real_import)


# ---- Modal CLI auth fails ----


def test_modal_token_list_nonzero(monkeypatch: pytest.MonkeyPatch) -> None:
    _all_env_present(monkeypatch)
    _patch_git_bin(monkeypatch)
    _patch_imports_ok(monkeypatch)
    monkeypatch.setattr(
        preflight.subprocess,
        "run",
        _build_subprocess_run(token_list_returncode=1),
    )

    assert preflight.run_all_checks() == preflight.EXIT_MODAL_AUTH


# ---- OpenAI key rejected ----


def test_openai_returns_401(monkeypatch: pytest.MonkeyPatch) -> None:
    _all_env_present(monkeypatch)
    _patch_git_bin(monkeypatch)
    _patch_imports_ok(monkeypatch)
    monkeypatch.setattr(
        preflight.subprocess, "run", _build_subprocess_run()
    )
    _patch_httpx_get(monkeypatch, 401)

    assert preflight.run_all_checks() == preflight.EXIT_OPENAI_REJECTED


# ---- Modal secret missing ----


def test_modal_secret_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    _all_env_present(monkeypatch)
    _patch_git_bin(monkeypatch)
    _patch_imports_ok(monkeypatch)
    monkeypatch.setattr(
        preflight.subprocess,
        "run",
        _build_subprocess_run(
            secret_list_stdout=(
                "Name              Last used    Created\n"
                "some-other-name   never        a few seconds ago\n"
            ),
        ),
    )
    _patch_httpx_get(monkeypatch, 200)

    assert preflight.run_all_checks() == preflight.EXIT_MODAL_SECRET


# ---- Python version too old ----


def test_python_version_too_old(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_version = (3, 10, 14, "final", 0)

    class _FakeVersionInfo(tuple):  # type: ignore[type-arg]
        @property
        def major(self) -> int:
            return self[0]

        @property
        def minor(self) -> int:
            return self[1]

    monkeypatch.setattr(
        preflight.sys, "version_info", _FakeVersionInfo(fake_version)
    )

    assert preflight.check_python_version() == preflight.EXIT_PYTHON_VERSION
