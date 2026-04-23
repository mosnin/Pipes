# Local Development

## Mock mode
- deterministic AI output fixtures (no provider credentials)
- template instantiation works end-to-end
- import/export and AI review/commit flows are available
- protocol hardening features (idempotency, rate limiting, error model, audits) also work locally
- selective AI edit review and existing-system merge planning flows are available in mock mode

```bash
cp .env.example .env.local
# PIPES_USE_MOCKS=true
# NEXT_PUBLIC_PIPES_USE_MOCKS=true
# PIPES_ADMIN_ALLOWLIST=owner@pipes.local
npm install
npm run dev
```

## Real provider mode
```bash
cp .env.example .env.local
# PIPES_USE_MOCKS=false
# NEXT_PUBLIC_PIPES_USE_MOCKS=false
# CONVEX_URL=...
# NEXT_PUBLIC_CONVEX_URL=...
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4.1-mini
# PIPES_ADMIN_ALLOWLIST=ops@example.com,admin@example.com
npm install
npm run dev
```

## Internal operator surfaces
- `/admin` support inspection
- `/admin/insights` product/ops insight summaries
- `/settings/audit` richer audit filters + CSV export
- `/settings/trust` enterprise trust/governance settings

## Public growth surfaces
- `/use-cases` and `/use-cases/[slug]`
- `/compare` and `/compare/[slug]`
- `/templates/[slug]` template detail/share pages
- `/api/marketing/signal` bounded public conversion signal endpoint

## Protocol DX artifacts
- OpenAPI: `docs/openapi/protocol.json`
- Error model: `docs/errors.md`
- MCP guide: `docs/mcp.md`
- SDK examples: `examples/protocol/client.ts`, `examples/protocol/client.py`


## Editor resilience checks
- Use undo/redo shortcuts in editor (`Ctrl/Cmd+Z`, `Shift+Ctrl/Cmd+Z`).
- Use canvas speed shortcuts: duplicate (`Ctrl/Cmd+D`), fit content (`Ctrl/Cmd+0`), frame selected (`Shift+F`), delete selection (`Delete/Backspace`), escape to clear selection.
- Use insert palette shortcuts: open (`/` or `Ctrl/Cmd+K`), navigate (`↑`/`↓`), confirm (`Enter`), context insert (`Shift+O` downstream, `Shift+I` upstream from selected node).
- Validate node library metadata (description, tags, typical use, input/output types) and category grouping.
- Validate favorites + recents persistence across reload.
- In inspector, validate tabbed design surface (`overview`, `inputs`, `outputs`, `config`, `notes`, `validation`, `docs`).
- Model typed input/output contracts with required/optional fields, sample payloads, mapping placeholders, and expected source references.
- Confirm compatibility hints update when connected nodes use mismatched output/input port types.
- Validate subsystem flow: select multiple nodes -> create subsystem -> collapse/expand -> open in context.
- Validate collapse-aware boundary edges remain readable when subsystem is collapsed.
- Validate layout presets (`left_to_right`, `top_to_bottom`) for selected region and whole graph.
- Validate edge semantics: labels, condition labels, route kind badges (`success`, `failure`, `conditional`, `loop`), and route notes in edge inspector.
- Verify route focus mode de-emphasizes non-focused edges while selected/trace edges remain high contrast.
- Verify simulation section reports traversed pipes, branch decisions, loop summaries, and blocked traces.
- Validate builder agent chat panel in system editor: create session, send prompt, observe streamed assistant deltas and run status transitions.
- Verify run events replay from persisted history by reloading and re-opening the same system.
- Observe save state badge transitions by disconnecting/reconnecting network while mutating graph.
- Recovery buffer key: `pipes_recovery_<systemId>` in localStorage (queued graph actions only).
- Editor reliability signals are visible in audit stream with `signal.editor_` and autosave/undo/redo events.


## Library and onboarding checks
- Use `/dashboard` search and status controls to validate active/favorites/archived/mine/shared filters.
- Favorite + tag updates are persisted via library actions (`/api/library`) and reflected in recents/favorites sections.
- Onboarding recommendations are available via `/api/onboarding` with role/use-case hints.
- Activation/library signals are visible in audit stream as `signal.*` events.


## Launch readiness local checks
- Run viewport sweep at 1366px, 1024px, and 900px widths.
- Verify keyboard-only navigation for dashboard and settings actions.
- Execute smoke checklist in `docs/qa_checklist.md` before release tags.

## Beta launch local rehearsal
- Submit structured feedback in `/settings/feedback`.
- Review release summary in `/admin/release`.
- Triage submitted items in `/admin/issues`.
- Follow staged launch workflow in `docs/beta_operations.md`.


### Agent action development

Run focused checks:

```bash
npm run test -- tests/unit/agent-builder.test.ts tests/unit/agent-graph-actions.test.ts
```

Mock mode emits deterministic action proposals with one auto-applied and one review-required example.


### Agent planner/tool/approval checks

```bash
npm run test -- tests/unit/agent-builder.test.ts tests/unit/agent-graph-actions.test.ts
```

The mock provider simulates plan creation, tool calls, safe proposals, and approval-required proposals.


### Multi-stage builder checks

```bash
npm run test -- tests/unit/agent-builder.test.ts tests/unit/agent-graph-actions.test.ts
```

These tests cover staged progression, specialist activity persistence, plan revisions, batching lineage, and approval interrupt/resume behavior.

### Real sub-agent execution checks

Provider mode (with `PIPES_USE_MOCKS=false` and `OPENAI_API_KEY` set) uses model-backed sub-agent execution through the AI boundary while preserving typed proposal/apply safety.

Mock mode keeps deterministic sub-agent execution with the same persisted contracts.

- To exercise selective review APIs, run a builder flow then inspect `/api/agent/runs/{runId}/batches/{batchId}` and related `preview`, `selection/validate`, `selection`, and `region` routes.

### Memory and strategy APIs
- List memory: `GET /api/agent/memory?systemId=...`
- List/set strategy: `GET/POST /api/agent/strategies`
- List/save patterns: `GET/POST /api/agent/patterns`
- List/record decisions: `GET/POST /api/agent/decisions`

Mock mode simulates retrieval + strategy-guided continuity using the same contracts as provider mode.

## Inspecting evaluation artifacts locally

In mock mode, each run can generate evaluation artifacts and at least one lifecycle signal (promote/demote) when patterns are reused. Inspect with:
- `GET /api/agent/evaluations?runId=<runId>&systemId=<systemId>`
- `GET /api/agent/strategy-performance?runId=<runId>&systemId=<systemId>`
- `GET /api/agent/skill-performance?runId=<runId>&systemId=<systemId>`
- `GET /api/agent/pattern-lifecycle?systemId=<systemId>`
- `GET /api/agent/learning-artifacts?runId=<runId>&systemId=<systemId>`

## Collaborative review endpoints

Use these APIs during local mock-mode testing:
- `POST/GET /api/agent/collaboration` for run reviewer presence and collaboration state
- `POST/GET /api/agent/review-comments` for threaded comments on run/plan/batch/diff targets
- `POST /api/agent/review-threads/{threadId}/resolve`
- `POST /api/agent/approval-feedback` for recommendation/object/final-decision records
- `POST /api/agent/handoffs` and `POST /api/agent/handoffs/{handoffId}/accept`
- `POST /api/agent/revision-requests`

## Policy control endpoints

- `GET/POST /api/agent/policy`
- `GET /api/agent/runs/{runId}/policy`
- `GET /api/agent/runs/{runId}/policy-events` (decision records, escalations, runtime usage)

Mock mode and provider mode share this policy contract surface.


## Running agent operations locally

- Mock mode: `npm run dev` with default runtime mode, then call `/api/agent/runs/:runId/pause`, `/cancel`, `/retry`, `/fork`, and `/replay`.
- Provider mode: set provider env vars and Convex deployment values, then run `npm run dev` and use the same operator APIs; behavior remains Pipes-native (no raw provider event contracts).


## Handoff generation and export

- Generate package: `POST /api/handoff/systems/{systemId}/packages` with `{ "target": "codex" }` (or `human_engineer`, `claude_code`, `general_llm_builder`).
- Review package: `POST /api/handoff/packages/{packageId}/review` with decision `approved|rejected|revision_requested`.
- Export approved package: `POST /api/handoff/packages/{packageId}/export` with format `markdown_bundle|json_manifest|prompt_pack_text`.
- Retrieve target prompt pack: `GET /api/handoff/packages/{packageId}/prompt-pack?target=codex`.


## Runtime stack local usage

- Mock runtime: set `PIPES_USE_MOCKS=true`, run `npm run dev`, and inspect `GET /api/agent/runs/{runId}/runtime` for routing/lifecycle records.
- Provider runtime with OpenAI harness: set `PIPES_USE_MOCKS=false`, `OPENAI_API_KEY`, optional `OPENAI_MODEL`; run `npm run dev`.
- Modal-backed execution: additionally set `MODAL_EXECUTOR_URL` and optional `MODAL_EXECUTOR_TOKEN`; eligible tasks route to `modal_worker`/`modal_sandbox` based on policy and routing rules.


## Sandbox artifacts, sessions, and previews

- Sessions: `GET /api/agent/runs/{runId}/sandbox/sessions` and `GET /api/agent/sandbox/sessions/{sessionId}`
- Artifacts: `GET /api/agent/runs/{runId}/sandbox/artifacts`
- Preview: `GET /api/agent/sandbox/artifacts/{artifactId}/preview`
- Normalization: `GET /api/agent/runs/{runId}/sandbox/normalization`

In provider mode with `MODAL_EXECUTOR_URL`, eligible tasks can emit sandbox artifacts; in mock mode the same contracts run with fallback normalization behavior for local inspectability.
