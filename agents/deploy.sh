#!/usr/bin/env bash
# Deploy the Pipes agent runner to Modal. Idempotent: re-run any time.
#
# Step 0 runs `agents/preflight.py` to fail fast on any missing
# prerequisite (env vars, deps, Modal auth, OpenAI key, secret). Only
# when every check passes do we hand off to `modal deploy`.
#
# After deploy, copy the printed HTTPS URL into PIPES_AGENT_ENDPOINT_URL
# in the Next.js production env. The Next.js route fans out to that URL.

set -euo pipefail

# Resolve script directory + project root so the script works no matter
# where the operator runs it from.
SCRIPT_DIR="$( cd "$(dirname "${BASH_SOURCE[0]}")" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

echo "Pipes agent runner - deploy"
echo

# Step 0: preflight. Exits non-zero with a clear message on any
# failure; deploy.sh stops here in that case.
echo "==> Step 0: Running preflight..."
if ! python agents/preflight.py; then
  echo
  echo "Preflight failed. Fix the reported issue and re-run." >&2
  echo "See docs/production-checklist.md, Step 0." >&2
  exit 1
fi
echo

# Step 1: deploy. `modal deploy` is itself idempotent: re-running on an
# unchanged image is a fast no-op; re-running on a changed image
# replaces the live function in place. No extra bookkeeping needed.
echo "==> Step 1: Deploying agents/sandbox.py to Modal..."
if ! modal deploy agents/sandbox.py; then
  echo
  echo "modal deploy failed. Common causes:" >&2
  echo "  - The image build broke (check pip lines in agents/sandbox.py::_build_image)." >&2
  echo "  - The Modal secret `pipes-agent-secrets` was deleted between preflight and deploy." >&2
  echo "  - Modal's API is throttling or unavailable. Re-run after a minute." >&2
  echo "Re-run with MODAL_LOGLEVEL=DEBUG bash agents/deploy.sh for verbose output." >&2
  exit 1
fi

echo
echo "==> Deploy complete."
echo "==> Capture the endpoint URL with:"
echo "        modal app stats pipes-agent"
echo "==> Then set in production env:"
echo "        PIPES_AGENT_ENDPOINT_URL=<endpoint-url>"
echo "==> Next: run the live eval per docs/production-checklist.md, Step 6."
