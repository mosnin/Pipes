# Decisions

Pipes can judge parts of a run with decision models instead of leaving every
judgment to the agent or a person. It is built on one rule from the
decision-model work Pipes studied (TypeSafe's Jev, the Jev OS method, and the
system-one-connector, jevmail, jev-kit and claude-x-jev projects):

> **The model makes judgments; code makes decisions.**

A decision model answers narrow questions with probabilities. A policy written
in code turns those probabilities into an action, and every decision leaves a
receipt so it can be audited, labelled and measured before anything is
automated.

## What Jev is

Jev (`typesafe/jev-1.14` on OpenRouter) is a *decision model*, a "system 1"
model. It never writes text. You send it a situation (`state`) and typed
questions, and it returns:

- **choice**: one of up to 255 options, with every option's probability and a
  confidence that measures how concentrated the probabilities are (not whether
  the answer is right);
- **score**: a position on 2 to 10 described levels;
- **noul**: the probability a statement is true (0.5 means "cannot tell").

Pipes reaches it through OpenRouter's Decisions API
(`POST https://openrouter.ai/api/alpha/decisions`), which also reports the cost
of each call.

## The cascade

For every judgment:

1. **Code rules first, no model call.** One route needs no judgment. An explicit
   `next` from the performer wins. Steps that did not opt in are never judged.
2. **Fast tier.** A decision model answers, in one request, the main question
   plus companion yes/no questions ("does any route fit?", "is there enough
   evidence?"), so a forced pick shows up as a low fit instead of a confident
   wrong answer.
3. **Policy, in code** (`src/domain/decisions/policy.ts`). The result is
   one of four actions:
   - **auto**: act. Only in live mode, only when confident and the route
     fits, and never for high-consequence steps.
   - **suggest**: attach the pick to the step for the performer to confirm.
   - **human**: nothing fits, or the evidence is missing; a person decides.
   - **fallback**: the model failed, timed out or answered off the menu.
     Pipes behaves exactly as it did without decisions. An error is never a "no".
4. **Deliberate tier (optional, per step).** When the fast tier is unsure, an
   LLM on OpenRouter (strict JSON schema: choice, confidence, rationale,
   evidence quotes, missing information) is asked for a second opinion. Its
   self-reported confidence is shown but never used as a gate: it may only
   confirm the fast pick. Evidence quotes that do not appear in the state are
   thrown away, and if most are invented, a person decides.

Starting thresholds (`THRESHOLDS` in `policy.ts`): act at 70% confidence for
low-consequence steps and 85% for medium; never for high; suggest from 40%;
treat "fits" below 30% as no fit. **These are starting points, not calibrated
values.** The Decisions page shows how each confidence band performs once
receipts are labelled; tune from that.

## Where it plugs in

| Judgment | Turn on | What happens |
|---|---|---|
| Which route a Decision, Router or Condition step takes | Step inspector, Decisions, "Let Pipes choose the route" | Live and sure: Pipes completes the step down that route itself, recorded as "Pipes decision". Otherwise the step carries a suggestion, shown in `get_current_step` (`suggestion`, and in the hint) and on the run page. |
| What a free-text outcome meant | Always, when decisions are on | When an agent reports an outcome no route matches, Pipes asks which route it meant. Clear match in live mode: it takes it. Otherwise the error tells the agent which route Pipes thinks it meant. |
| Whether a step met its finish line | Step inspector, "Check each completion against Done when" | The completion is checked against `doneWhen` and flagged on the run (met, not met, unclear). It never blocks. |
| What to do with an approval | Always, when decisions are on | The approval panel shows a suggested decision, a risk level and whether the work looks complete. **A suggestion only. Approvals are always decided by a person.** |

## Receipts and calibration

Every decision writes a `decision_receipt` document: the question contract and
version, the mode, the redacted state, the options, each tier's answers,
latency and cost, the action, the reason and, later, a **label**: what the
performer or person actually did. Labels come for free:

- a suggested route is labelled with the route the performer took;
- an approval suggestion is labelled with the person's decision.

`GET /api/decisions` and Settings, Decisions show agreement by confidence band
and counts by kind. Raise a step's trust (lower its consequence) only when its
band agrees almost every time.

## Modes and settings

| Variable | Default | Meaning |
|---|---|---|
| `OPENROUTER_API_KEY` | none | Turns decisions on. Without it Pipes uses a deterministic stand-in in mock mode, and no decisions otherwise. |
| `PIPES_DECISIONS` | `shadow` | `off`, `shadow` (ask, record, suggest, never act) or `live`. Start in shadow. |
| `PIPES_DECIDER_FAST_MODELS` | `typesafe/jev-1.14` | Comma list, tried in order when one fails. Pin dated slugs once thresholds are tuned. |
| `PIPES_DECIDER_DELIBERATE_MODELS` | none | Comma list sent as OpenRouter `models` for the second opinion. |
| `PIPES_DECIDER_FAST_TIMEOUT_MS` | 1500 | Deadline for a fast decision. |
| `PIPES_DECIDER_DELIBERATE_TIMEOUT_MS` | 12000 | Deadline for a second opinion. |
| `PIPES_DECIDER_MAX_COST_MICROS` | 20000 | No second opinion once a decision has cost this much. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api` | For a proxy. |

Model spend is metered as `decision_fast` and `decision_deliberate` usage
events with integer micro-dollar costs, shown on the Usage page. Deliberate
calls ask OpenRouter to route only to providers that do not train on data.

## Files

| Piece | File |
|---|---|
| OpenRouter client (fast and deliberate) | `src/lib/ai/openrouter/client.ts` |
| Deterministic stand-in | `src/lib/ai/openrouter/mock.ts` |
| Every question's wording, versioned | `src/domain/decisions/contracts.ts` |
| Policy truth tables and thresholds | `src/domain/decisions/policy.ts` |
| Cascade, receipts, labels, calibration | `src/domain/decisions/service.ts` |
| Wiring into runs | `applyDecisions` and `complete` in `src/domain/runs/service.ts` |
| Tests | `tests/unit/decisions.test.ts` |

## What Pipes deliberately does not do

- Let a model approve or reject a human approval step.
- Ask a model "what should the agent do next?"; that is the workflow's job.
- Replace exact code rules (risk classification, runtime routing).
- Use an LLM's own confidence as a gate.
- Float model aliases like `~latest` under tuned thresholds.

## Not built yet

- Replaying stored receipts against a new contract or model before shipping it.
- Threshold tuning from labels (a sweep for the lowest threshold that meets a
  precision target), and per-step thresholds.
- Moving the editor's assistant from OpenAI onto OpenRouter.
