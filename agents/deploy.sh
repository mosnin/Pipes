#!/usr/bin/env bash
# Deploy the Pipes agent runner to Modal. Idempotent: re-run any time.
#
# Prereqs:
#   * `pip install modal` (or `uv pip install modal`)
#   * `modal token new` once per workstation
#   * `modal secret create pipes-agent-secrets OPENAI_API_KEY=sk-...`
#
# After deploy, copy the printed HTTPS URL into PIPES_AGENT_ENDPOINT_URL in
# the Next.js .env.local. The Next.js route fans out to that URL.

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v modal >/dev/null 2>&1; then
  echo "modal CLI not found. Run: pip install modal" >&2
  exit 1
fi

modal deploy agents/sandbox.py
