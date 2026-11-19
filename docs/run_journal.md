# The run journal

Every change to a run is recorded as an event in the run's journal, in the same
transaction that saves the run. The journal answers three questions a run
record alone cannot:

1. **What exactly happened, in what order, and who did it?** Each event has a
   sequence number, the time, the actor and the data.
2. **What did the run look like at any point?** Replay the events up to a
   sequence number.
3. **Would an engine change alter real runs?** Replay recorded journals through
   the new engine and compare.

## Shape

Events are stored as documents of kind `run_event`, `refId` = the run id, id
`<runId>:<seq zero-padded>`. Types are in `src/domain/rails/types.ts`.

```ts
type RunEvent = {
  runId: string;
  seq: number;        // the run's rev after this event
  at: string;         // the clock value passed to the engine
  actor: Actor;       // who did it; rails use { type: "trigger", id: "rails" }
  type: RunEventType;
  idempotencyKey?: string;
  data: Record<string, unknown>;
};
```

| Type | Data |
|---|---|
| `run.started` | systemId, workspaceId, systemName, trigger, input, versionId, versionName, startNodeId |
| `step.completed` | nodeId, outcome, output, notes, next, costMicros |
| `approval.decided` | decision, comment, sendBackTo |
| `step.timed_out` | nodeId, failRunInstead |
| `run.deadline_exceeded` | (none) |
| `run.finished` | code, message (a rail ended the run, for example `budget_steps`) |
| `run.canceled` | reason |

## Why it can replay

The run engine (`src/domain/runs/engine.ts`) is a pure function of the
workflow snapshot and its inputs, and it takes the clock as an input (`at`).
`replay(snapshot, events)` in `src/domain/rails/journal.ts` folds the events
back through the same engine functions with the recorded times, and returns a
run equal to the stored one. `tests/unit/rails.test.ts` asserts that equality.

## Reading it

- MCP: `get_run_events { runId, afterSeq? }` (capability `runs:read`). An agent
  that reconnects passes the last `seq` it saw and gets only what changed.
- REST: `GET /api/runs/{runId}/events?afterSeq=`.

## Guarantees and limits

- The run document and its events are written together or not at all.
- Sequence numbers are gap-free per run.
- Runs created before the journal existed have no events for their earlier
  history; their `rev` starts at 0.
- Reading a run can append events (a deadline or timeout coming due).
