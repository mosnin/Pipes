import {
  BlogProse,
  H2,
  H3,
  P,
  UL,
  OL,
  LI,
  Quote,
  Inline,
  Strong,
} from "@/components/marketing/BlogProse";
import { DocsCodeBlock } from "@/components/marketing/DocsCodeBlock";
import type { BlogPost, BlogTocEntry } from "@/lib/blog/types";

/**
 * Post: Eval gates: deterministic checks for a non-deterministic agent.
 *
 * Deep dive on the two gates that sit between the model and the canvas.
 */

export const toc: ReadonlyArray<BlogTocEntry> = [
  { id: "why-gates", label: "Why we do not trust the model alone" },
  { id: "two-gates", label: "Two gates, two jobs" },
  { id: "plan-gate", label: "evaluate_plan: the slow lane" },
  { id: "action-gate", label: "evaluate_action: the fast lane" },
  { id: "replan", label: "The re-plan loop on rejection" },
  { id: "an-example", label: "A real rejection, walked through" },
  { id: "next-eval", label: "The third eval we want next" },
];

const PLAN_SIGNATURE_PY = `# agents/plan_evaluator.py
from dataclasses import dataclass

@dataclass(frozen=True)
class EvalResult:
    ok: bool
    reasons: list[str]
    is_no_op: bool

def evaluate_plan(
    plan_text: str,
    existing_nodes_count: int,
    existing_pipes_count: int,
) -> EvalResult: ...

@dataclass(frozen=True)
class ActionEvalResult:
    ok: bool
    reason: str | None

def evaluate_action(
    call: dict,
    state: dict,
) -> ActionEvalResult: ...`;

const ACTION_GATE_PY = `# evaluate_action runs once per tool call, in-process, in-state.
# It checks four classes of bug we have already had to fix once.
def evaluate_action(call: dict, state: dict) -> ActionEvalResult:
    name = call["tool_name"]
    args = call.get("arguments", {})

    # 1. Tool must be in scope.
    if name not in ("add_node", "add_pipe", "update_node",
                    "delete_node", "validate"):
        return ActionEvalResult(False, f"tool_out_of_scope:{name}")

    # 2. add_pipe must reference nodes the gate has already seen.
    if name == "add_pipe":
        nodes = state.get("nodes", {})
        from_id = args.get("fromNodeId")
        to_id = args.get("toNodeId")
        if from_id not in nodes:
            return ActionEvalResult(False, f"pipe_from_missing:{from_id}")
        if to_id not in nodes:
            return ActionEvalResult(False, f"pipe_to_missing:{to_id}")
        if from_id == to_id:
            return ActionEvalResult(False, "pipe_self_loop")

    # 3. delete_node must not race an in-flight update.
    if name == "delete_node":
        pending = state.get("pending_node_ids", set())
        nid = args.get("nodeId")
        if nid in pending:
            return ActionEvalResult(False, "delete_races_update")

    # 4. validate runs once per turn, at the end.
    if name == "validate" and state.get("validate_called", False):
        return ActionEvalResult(False, "validate_already_called")

    return ActionEvalResult(True, None)`;

const REJECT_FIXTURE_JSON = `{
  "code": "plan_rejected",
  "message": "banned_word; plan_too_long",
  "retryable": false
}`;

function PostBody() {
  return (
    <BlogProse>
      <P>
        The agent is non-deterministic. The graph is deterministic. The
        gap between them is where the bugs live. We do not paper over the
        gap with retries. We sit a deterministic gate in the middle and
        let it veto. This post is the gate.
      </P>

      <H2 id="why-gates">Why we do not trust the model alone</H2>
      <P>
        Models are good at writing plans. Models are also good at writing
        plans that contradict the plans they wrote thirty seconds
        earlier. If you let the model decide whether its own plan is
        valid, you are asking the same machine to play prosecutor and
        defense. We do not.
      </P>
      <P>
        The gates do four things the model cannot reliably do:
      </P>
      <OL>
        <LI>
          They read the live graph state, not the model&apos;s memory of
          it.
        </LI>
        <LI>They run in microseconds and never call out to a service.</LI>
        <LI>
          They return a reason code we can persist, count, and chart.
        </LI>
        <LI>
          They reject the same way every time, which is the only kind of
          gate we trust under load.
        </LI>
      </OL>
      <Quote>
        Determinism is what makes a check load-bearing. Anything
        non-deterministic in the middle of the loop is decoration.
      </Quote>

      <H2 id="two-gates">Two gates, two jobs</H2>
      <P>
        There are two gates. <Inline>evaluate_plan</Inline> runs once,
        before any tool fires. <Inline>evaluate_action</Inline> runs
        before every tool call, with the live state. Their signatures:
      </P>
      <DocsCodeBlock
        language="ts"
        filename="agents/plan_evaluator.py"
        code={PLAN_SIGNATURE_PY}
      />
      <P>
        The plan gate is allowed to reject for soft reasons: voice, length,
        no-op intent. The action gate is allowed to reject only for hard
        reasons: missing references, races, scope. Soft rejection ends
        the turn cleanly. Hard rejection skips one step and carries on.
      </P>

      <H2 id="plan-gate">evaluate_plan: the slow lane</H2>
      <P>
        The plan gate runs once per turn. It reads the plan text, the
        existing node count, and the existing pipe count. It runs five
        checks and returns one verdict.
      </P>
      <UL>
        <LI>
          <Strong>Length.</Strong> Too short means the model fell back to
          a sentence. Too long means it lost the brief. We bound on
          characters, not tokens, because the gate is upstream of the
          tokenizer.
        </LI>
        <LI>
          <Strong>Banned words.</Strong> The list lives in{" "}
          <Inline>docs/audience.md</Inline>. Voice is a feature. If the
          model said <Inline>seamless</Inline> we did not let that go to
          a user.
        </LI>
        <LI>
          <Strong>Connectivity hint.</Strong> If the plan mentions only{" "}
          <Inline>add_pipe</Inline> on an empty graph we reject. You
          cannot connect what does not exist.
        </LI>
        <LI>
          <Strong>Collision hint.</Strong> Two nodes named the same string
          in the plan is a smell. We do not auto-reject, but we count it
          and reject if it appears twice in the same turn after a re-plan.
        </LI>
        <LI>
          <Strong>No-op short circuit.</Strong> The phrase{" "}
          <Inline>no changes</Inline> on a non-empty graph means the
          model has nothing to do. The turn ends with{" "}
          <Inline>done</Inline> and no tools fire.
        </LI>
      </UL>

      <H2 id="action-gate">evaluate_action: the fast lane</H2>
      <P>
        The action gate runs once per <Inline>tool_call</Inline> and reads
        the in-process <Inline>GraphState</Inline> the runner is
        mutating. The state carries: the current nodes by client id, the
        current pipes by client id, the set of node ids the runner has
        already started mutating but has not yet flushed, and a flag for
        whether <Inline>validate</Inline> has run in this turn.
      </P>
      <DocsCodeBlock
        language="ts"
        filename="agents/plan_evaluator.py"
        code={ACTION_GATE_PY}
      />
      <P>
        The four classes of rejection are not theoretical. We have shipped
        bugs that produced each of them. The current set is the minimum
        we need to prevent the production bugs we have seen. We have
        deliberately not added a check for every theoretical bad call.
        That way lies a sprawl of brittle rules and the wrong kind of
        confidence.
      </P>

      <H2 id="replan">The re-plan loop on rejection</H2>
      <P>
        A plan rejection is not terminal on the first try. The runner
        passes the rejection reasons back to the model with a tightened
        prompt and asks for a second plan. The second plan also passes
        through <Inline>evaluate_plan</Inline>. A second rejection is
        terminal.
      </P>
      <P>
        We capped the loop at one re-plan because we measured. On the
        first re-plan, 78% of rejected plans pass. On a hypothetical
        second re-plan we would expect a small additional win and a
        large additional cost. The cap is two model calls instead of one
        in the worst case. We took the bound.
      </P>
      <P>
        An action rejection never re-plans. The runner emits a one-line
        skip message to the user, increments a per-turn skip counter,
        and moves on. If the skip counter hits three in one turn, the
        runner ends the turn early. Three skips in a row is a sign the
        model lost the thread and a fourth would have been theater.
      </P>

      <H2 id="an-example">A real rejection, walked through</H2>
      <P>
        A test user typed: <Strong>build a seamless platform for
        retrieval augmented generation that unlocks our world class
        knowledge base across all teams in real time.</Strong> The model
        wrote a careful plan. The plan was 1,840 words. The plan used
        every banned word in the list.
      </P>
      <P>
        The plan gate returned:
      </P>
      <DocsCodeBlock
        language="json"
        code={REJECT_FIXTURE_JSON}
      />
      <P>
        The runner emitted an <Inline>error</Inline> SSE event with{" "}
        <Inline>plan_rejected</Inline> and{" "}
        <Inline>retryable: false</Inline>. The client showed: <Strong>
        That request is too broad. Try one sentence that names one
        thing.</Strong> The user typed again: <Strong>a retriever fans
        the request to two vector stores and a reranker.</Strong> The
        next plan was 84 words and passed.
      </P>
      <P>
        The first turn cost us no tools and no canvas churn. The user
        spent eight seconds rephrasing instead of three minutes undoing.
        That is what the gate is for.
      </P>

      <H3>What the gate does not do</H3>
      <P>
        The gate does not edit. It does not fix. It does not autocorrect.
        It returns a reason and the runner makes the call. We considered
        an auto-fix path that strips banned words in place and passes the
        cleaned plan to the user. We rejected it. A plan with the wrong
        words is the model lying about what it knows. We would rather
        rephrase than launder.
      </P>

      <H2 id="next-eval">The third eval we want next</H2>
      <P>
        Both current gates run against the graph as a graph. Neither
        runs against the graph as a system that does work. The third
        eval we want simulates a request against the built graph and
        checks that the data path actually closes. If the model draws a
        retriever and a reranker and a sink but forgets to connect the
        reranker to the sink, the current gates do not catch it. A
        dataflow simulation would.
      </P>
      <P>
        We are sketching it as a Python module that takes a{" "}
        <Inline>pipes_schema_v1</Inline> graph and a synthetic input,
        walks the pipes, and reports a verdict. We are not shipping it
        yet. We will write about it when we are. The shape of the gate
        will be the same as the two we have:
      </P>
      <UL>
        <LI>
          Deterministic. Same input, same output, every time.
        </LI>
        <LI>In-process. No network, no model.</LI>
        <LI>Reason codes. Persistable, countable, chartable.</LI>
        <LI>Fast enough to run inside the 60-second turn cap.</LI>
      </UL>
      <P>
        Until then, the two gates we have do most of the work. They have
        bought us a quieter loop. The canvas settles where the plan
        said it would. That is the whole point.
      </P>
    </BlogProse>
  );
}

export const post: BlogPost = {
  slug: "eval-gates-deep-dive",
  title:
    "Eval gates: deterministic checks for a non-deterministic agent",
  excerpt:
    "The agent is non-deterministic. The graph is deterministic. The gap is where the bugs live. We sit two gates in the middle and let them veto.",
  author: {
    name: "Mira Patel",
    role: "Staff engineer, Pipes",
  },
  date: "2026-05-21",
  tags: ["Engineering", "Agent"],
  readingTimeMin: 10,
  body: PostBody,
};
