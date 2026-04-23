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

## Agent builder foundation
- System editor now includes an attached builder chat panel with session + run history and realtime streamed run events.
- Current capability is planning/explanation only; graph mutation remains explicitly out-of-scope in this slice.
- Run events are persisted and replayable for deterministic UI hydration and later approval/action extension.


### Builder agent live mutation

Builder chat can now propose typed graph actions and apply safe actions live so the canvas updates from persisted state. Risky changes are explicitly held for user review before apply.


### Approval-aware systems copilot

The builder agent now behaves as a planning copilot with visible tool use and explicit approvals for risky system edits. Risky actions pause runs for human decision and checkpoint policy is enforced before risky apply.


### Multi-stage specialist copilot

Builder runs now show staged construction progress and specialist participation (architect, validator, builder, explainer), improving legibility and quality for larger system-building prompts.

### Real bounded sub-agent delegation

- The orchestrator now creates and executes bounded sub-agent tasks against subsystem-scoped context.
- In provider mode, sub-agent skills are model-backed and normalized into persisted results.
- Reconciliation converts sub-agent outputs into plan revisions and proposal batches with explicit conflict handling.
- Trusted mutation authority is preserved: sub-agents never write graph state directly.

- Agent co-building includes selective diff review with dependency safety, preview toggles, and affected region highlighting before trusted apply.

### Compounding builder memory
- Pipes builder now carries continuity across runs by reusing bounded prior plan context, strategies, reusable subsystem patterns, and decision records.
- Reused memory is visible in the agent panel to preserve trust and inspection.

## Trust-oriented learning loop

Pipes now exposes run quality summaries and learning inputs directly in the builder surface: strategy effectiveness, skill outcomes, pattern promotion/demotion, and generated learning artifacts. Evaluation influences future recommendations but does not bypass review authority.

## Team-ready collaborative builder

Multiple collaborators can inspect and review the same run with explicit authorship, discussion threads, approval recommendations, handoff continuity, and revision-request negotiation. Owner/Admin remains final approval authority for trusted apply.

## Governable builder operations

Teams can now govern builder behavior with explicit policy for tool access, risk posture, approval strictness, runtime/cost limits, and escalation. Blocked or escalated behavior is surfaced with visible rationale in run review.


## Workspace operability improvements

Operators can now inspect run traces, replay timelines, compare run outcomes, select workspace presets, and assign bounded experiment variants to runs. This turns tuning into explicit workspace artifacts instead of hidden code-only behavior.


## Design-to-delivery bridge

Accepted system designs can now produce reviewable, versioned implementation handoff packages suitable for human engineers and coding agents. This improves trust that a designed system can become a build-ready plan without turning Pipes into an execution engine.


## Production-credible builder runtime

Pipes now includes a real runtime posture for system-building agents: host-authoritative orchestration, policy-aware routing, optional Agents-SDK-backed harness execution, and Modal-backed bounded worker/sandbox execution. This improves runtime credibility while preserving Convex/mock persisted truth and review-safe mutation boundaries.


## Inspectable sandbox artifact workflows

Pipes now makes sandbox-backed worker outputs materially useful: operators can inspect sessions, bundles, generated artifacts, preview outputs, and normalization status before trusting results. This improves confidence in worker execution without introducing a second state authority.
