# Enterprise Trust & Scale Posture

## Enterprise auth posture (current)

Pipes currently supports Auth0-based authentication with a bounded **SSO-readiness** settings model.

- `mode=shared`: standard shared auth posture.
- `mode=sso_ready`: workspace stores validated domain allowlist and intended Auth0 connection metadata.
- Full enterprise IdP provisioning (SAML/OIDC tenant-side setup and enterprise connection lifecycle) remains an Auth0 tenant operation and is intentionally not faked in product UI.

## Permission administration rules

- Member role changes remain service-enforced.
- Owner role is immutable in this pass.
- Ownership transfer is explicitly deferred.
- Self-demotion of admin is blocked in the safe role-change flow.
- Role changes are audited (`governance.member_role_changed`).

## Export guarantees

- Canonical system exports remain `pipes_schema_v1`.
- Workspace export is a bounded `workspace_manifest_v1` with:
  - `schemaVersion`
  - `exportedAt`
  - workspace context
  - system references and schema export endpoints
- Export actions are auditable (`governance.workspace_exported`).

## Deletion and archive semantics

- Systems: archive + restore supported.
- System hard delete: not supported in this pass.
- Workspace deletion: not supported in this pass.
- Workspace deactivation/reactivation: supported for controlled lifecycle state.

## Retention and lifecycle defaults

Default policy (first bounded pass):
- archived system retention: 365 days
- invite expiry visibility target: 7 days
- stale token review window: 90 days
- audit retention posture: 365 days
- product signal retention posture: 365 days

These are governance metadata defaults and not a full compliance automation subsystem.

## Large workspace readiness

- Collaboration settings now support search + role filtering across members/invites.
- Invite and member surfaces remain compact and role-oriented.
- Audit filtering remains available for actor/system/action/transport/outcome/time slices.

## Mock vs real mode

- Mock mode preserves full trust/gov flow testing locally.
- Real mode uses the same bounded services and route contracts; Auth0/Convex remain source-of-truth providers.

## Intentional deferrals

- No full IdP provisioning workflows in-product yet.
- No hard-delete flows for systems/workspaces.
- No full compliance retention executor (policy metadata only in this pass).
- No ownership transfer workflow in this pass.
