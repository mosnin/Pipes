# Product Overview

Pipes now supports structured creation flows:
1. Generate draft systems from prompts (Builder-gated).
2. Propose AI refactors for existing systems with selective per-change acceptance/rejection.
3. Instantiate credible starter templates.
4. Import canonical schema safely with merge planning for existing systems.
5. Export canonical schema and readable architecture summary.
6. Show collaboration occupancy and review-state cues in the editor.
7. Emit lightweight internal product signals for trust-sensitive editor flows.

This keeps Pipes a structured design platform, not a chat or orchestration engine.


## Editor quality guarantees (current pass)
- Reliable explicit-action undo/redo for core graph authoring actions.
- Calm save/sync state communication and bounded autosave recovery affordance.
- Crash containment around major editor panels with safe recovery actions.
- Lightweight observability for editor open, slow render thresholds, validation cost, autosave outcomes, recovery offers, and undo/redo usage.

### Intentional limits
- Recovery replays queued graph operations; it does not replace persisted version history.
- Undo/redo remains scoped to session-local graph actions and does not claim multi-user CRDT conflict resolution.


## System library model
- Primary organization model: **tags-first**.
- Retrieval supports search across name/description/tags plus status and sort controls.
- Library loop includes favorites, recents (from real opens), and reversible archive/restore.

## Activation model (v1)
- Onboarding start + completion are tracked explicitly.
- First system creation and first meaningful creation (template/AI/import path) are tracked.
- Activation is marked when a user completes onboarding through a meaningful path with at least one system artifact.

### Current limits
- Tag/favorite state is event-derived from bounded library audit events (lightweight by design).
- Search is repository/event-backed filtering (not full-text indexing yet).

## Post-launch learning surfaces
- Internal insights dashboard at `/admin/insights` focuses on activation, retention, failure counts, and protocol usage summaries.
- Internal support surface at `/admin` focuses on bounded inspection (workspace/user/system, audits, signals, token/invite state).
- Operator authorization is explicit via `PIPES_ADMIN_ALLOWLIST` and is separate from workspace collaboration roles.

## Enterprise trust readiness (current)
- `/settings/trust` centralizes auth-readiness, retention defaults, workspace export manifest, and lifecycle posture.
- Enterprise auth posture is honest: `sso_ready` stores validated workspace metadata for future Auth0 enterprise connection usage; it does not claim full in-product IdP provisioning.
- Member role administration now includes explicit safety constraints around owner/admin boundaries.

## Conversion and discovery posture (current)
- Homepage and logged-out IA emphasize systems-as-memory, validation/simulation, protocol readiness, and reusable templates.
- Use case and comparison pages are bounded, technical, and tied to real product concepts.
- Template detail pages are the current shareable public model (safe, non-sensitive, metadata-backed).


## Launch polish highlights
- Systems-first language standardized across dashboard, onboarding, and settings copy.
- Settings now present a cohesive navigation experience across billing/collaboration/tokens/audit.
- Empty, loading, and error states are now explicit and action-oriented for trust.

### Viewport expectations
- Fully supported: desktop and tablet-width workflows.
- Partial support: narrow desktop fallback for editor inspection and review, not full mobile authoring.
