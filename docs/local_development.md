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
