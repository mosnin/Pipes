# Kill switch runbook

Use this when agents are doing something they should not, and you need them to
stop now.

## Decide the scope

- **One workflow is misbehaving:** set the switch on that workflow.
- **You do not know which, or a token may be compromised:** set the switch on
  the workspace. Also revoke the token in Settings, API tokens.

## Decide the mode

- **Pause** if the runs in flight are fine to resume later. New runs are
  refused, and no step can be completed, so every run waits where it is.
  Approvals and cancels still work.
- **Halt** if the runs in flight must not continue. Everything pause does, and
  every active run in scope is canceled with the reason you give.

## Do it

In the app: Settings, Execution rails (workspace), or the workflow's Rails page.

Over the API (owners and admins):

```bash
curl -X POST https://<your-pipes>/api/rails \
  -H "content-type: application/json" \
  -H "cookie: <your session>" \
  -d '{"scope":"workflow","systemId":"sys_123","mode":"pause","reason":"Refunds paying twice"}'
```

`scope` is `workspace` or `workflow`; `mode` is `off`, `pause` or `halt`.

## Confirm

- Agents get `kill_switch` (HTTP 423) with your reason on their next call.
- The audit log shows `rails.kill_switch.pause` (or `.halt`) with who and why;
  for halt, how many runs were canceled.

## Recover

1. Fix the cause (the workflow, the token, the downstream system).
2. Set the switch to `off`. Paused runs continue from where they stopped;
   halted runs stay canceled and must be started again.
