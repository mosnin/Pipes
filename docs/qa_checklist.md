# QA Checklist

## Smoke flows
1. Login -> Systems dashboard -> Create blank system -> Open editor.
2. Dashboard search/filter -> favorite toggle -> tag update -> archive/restore.
3. Onboarding recommendation path -> template launch.
4. Billing settings load + checkout link flow.
5. Collaboration invite send + cancel flow.
6. Token creation + revoke flow.
7. Audit page filtering flow.
8. Not found route fallback.

## Release-candidate smoke sequence (recommended)
1. Signup -> onboarding -> first system created.
2. Template discovery (`/templates`) -> template detail (`/templates/[slug]`) -> signup CTA.
3. AI draft generate -> commit route in dashboard quick-create.
4. Invite send -> accept path -> collaborator visible.
5. Billing upgrade path (checkout session creation + billing status refresh).
6. Protocol token creation -> authenticated `GET /api/protocol/systems`.
7. Trust settings open -> workspace export manifest generation.

## Viewport sweep
- 1366x768 desktop baseline.
- 1024x768 tablet landscape.
- 900px narrow desktop fallback (no clipped controls).

## Beta operations checks
1. Submit feedback from `/settings/feedback` and verify item appears in `/admin/issues`.
2. Update feedback status from `new` to `reviewing` and `closed`.
3. Validate `/admin/release` sections for environment readiness, failure groups, and launch links.

## Canvas interaction checks
1. Multi-select nodes with shift + drag-box and validate duplicate (`Cmd/Ctrl+D`) and delete (`Delete/Backspace`) actions.
2. Verify snap-to-grid movement and alignment guide lines during node drag.
3. Validate fit content (`Cmd/Ctrl+0`) and frame selected (`Shift+F`) controls.
4. Open insert palette from empty canvas (`/` or `Cmd/Ctrl+K`) and confirm arrow navigation + Enter insert works.
5. Toggle favorites in Node Library and confirm favorite ordering is preserved after refresh.
6. Insert from selected node context and validate automatic connection from selected node to inserted node.
7. Insert from selected edge context and verify edge split + rerouted connections.
8. From inspector, run downstream (`Shift+O`) and upstream (`Shift+I`) insert flows and verify directional connection semantics.

## Inspector contract modeling checks
1. Verify inspector tabs: `overview`, `inputs`, `outputs`, `config`, `notes`, `validation`, and `docs`.
2. Add input and output fields with mixed required/optional flags and confirm schema summaries update.
3. Enter sample payloads and mapping expressions and confirm values persist during session reload.
4. Create a known mismatch (e.g., source `string`, target `json`) and verify compatibility hint appears in validation tab.
5. Verify docs tab supports linked asset/snippet/reference entries for node implementation context.

## Structure and subsystem checks
1. Select 2+ nodes, create subsystem, and confirm collapsed module node appears with node-count summary.
2. Verify collapsed subsystem shows aggregated boundary connections instead of internal edges.
3. Expand subsystem and verify internal nodes return with preserved positions.
4. Use “Open In Context” from subsystem list and verify frame-selected focuses internal nodes.
5. Run “Arrange Selection” and “Arrange Whole Graph” in both presets (`left_to_right`, `top_to_bottom`).
6. Validate minimap remains usable for navigation on large graphs while collapsed modules are visible.

## Advanced pipe semantics checks
1. Select an edge and set route labels/condition labels/route kind; verify label and visual style update on canvas.
2. Verify success/failure/loop/conditional routes render distinct visual treatment and larger hit targets.
3. Introduce a type mismatch and verify invalid pipe state is visually emphasized.
4. Enable route focus mode and confirm non-focused edges are calmer while selected and traced routes stay prominent.
5. Run simulation and confirm traversed pipes, branch decisions, loop summary, and blocked routes are visible in inspector.
