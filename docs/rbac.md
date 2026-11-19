# Roles and permissions

Every workspace member holds one role. Roles are cumulative: each one holds
everything the role below it holds. One table in
`src/domain/permissions/index.ts` decides every check in Pipes, on every
surface (pages, REST, MCP, server actions). `tests/unit/rbac.test.ts` fails if
this page and that table disagree.

## Roles

| Role | Who it is for |
|---|---|
| Viewer | People who need to see workflows and runs, and nothing else. |
| Commenter | Reviewers who leave comments. |
| Editor | People who build workflows and run them. |
| Admin | People who run the workspace: members, tokens, rails, security. |
| Owner | One person per workspace, who also holds billing and can hand the workspace on. |

## Permissions

| Permission | Lowest role | What it allows |
|---|---|---|
| `workflows.view` | Viewer | See workflows, runs and their history |
| `comments.write` | Commenter | Comment on workflows |
| `workflows.edit` | Editor | Create, edit, version, archive and restore workflows, triggers and memory |
| `runs.operate` | Editor | Start runs, complete steps and cancel runs |
| `connections.manage` | Editor | Add and change connections (stored secrets are never shown) |
| `members.manage` | Admin | Invite people, change roles below Admin, and remove members |
| `tokens.manage` | Admin | Create and revoke API tokens |
| `audit.view` | Admin | Read the audit log and security activity |
| `rails.manage` | Admin | Stop runs with kill switches and set token limits |
| `security.manage` | Admin | Set sign-in policies: two-step sign-in, session length, allowed email domains |
| `feedback.manage` | Admin | Triage feedback |
| `billing.manage` | Owner | Change the plan and billing details |
| `admins.manage` | Owner | Make, demote and remove Admins |
| `ownership.transfer` | Owner | Hand the workspace to another member |
| `workspace.deactivate` | Owner | Deactivate or reactivate the workspace |

Approval steps add their own rule: each step names the lowest role that may
decide it (Editor by default), and agents never decide approvals.

## Rules for changing roles

- Nobody changes their own role or removes themselves.
- Admins manage Editors, Commenters and Viewers. Only the Owner manages Admins.
- Nobody hands out a role above what they may assign: Admins assign up to
  Editor, the Owner up to Admin.
- There is always exactly one Owner. Ownership moves only by transfer: the new
  Owner takes over and the old Owner becomes an Admin, in one transaction.
- Removing a member takes effect on their next request. API tokens they
  created stop working at the same moment.
- Every change is written to the audit log with who, whom, and the roles
  before and after.

## Agents

An API or OAuth token acts with its creator's role, capped at Editor, and only
within the capabilities granted to the token (see [mcp.md](mcp.md)). A token
therefore never holds an Admin or Owner permission, and a token made by an
Admin who is later demoted to Viewer can only read.

## Refusals

A refused request gets HTTP 403 with `{ ok: false, error: "not_allowed",
permission, message }`. The message names the role needed, for example "You
need the Editor role or higher to start runs, complete steps and cancel runs."

## Adding a permission

1. Add a row to `PERMISSIONS` with its lowest role and a plain label.
2. Check it where the action happens with `assertCan(ctx, "...")` (domain) or
   `ensureCan(ctx, "...")` (route handlers).
3. Add the row to the table above. The test fails until you do.
