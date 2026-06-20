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
 * Post: How we built the plan-first agent.
 *
 * Voice: locked to docs/audience.md. One idea per sentence. Verbs over
 * nouns. No banned words. Real technical detail drawn from
 * agents/builder.py and docs/agent-contract.md.
 */

export const toc: ReadonlyArray<BlogTocEntry> = [
  { id: "the-bug", label: "The bug we kept hitting" },
  { id: "the-contract", label: "The five-step contract" },
  { id: "json-fence", label: "Parsing the plan off the message tail" },
  { id: "the-events", label: "Six SSE events on the wire" },
  { id: "eval-gates", label: "Two eval gates, deterministic" },
  { id: "cost-meta", label: "Carrying cost on the meta event" },
  { id: "whats-open", label: "What is still open" },
];

const EVENT_TYPES_TS = `// src/lib/agent/events.ts
export type ProviderEvent =
  | { kind: "tool_call"; id: string; tool_name: ToolName; arguments: object }
  | { kind: "tool_result"; id: string; ok: boolean; action?: EditorGraphAction; data?: object; error?: string }
  | { kind: "message"; text: string; role: "assistant" }
  | { kind: "plan_proposal"; planText: string; steps: PlanStep[]; autoExecuteAfterMs: number }
  | { kind: "status"; state: "thinking" | "calling_tool" | "writing_message"; tool_name?: string }
  | { kind: "meta"; cost: { tokens_in: number; tokens_out: number; dollars: number; model: string; provider: string }; tool_call_count: number; duration_seconds: number }
  | { kind: "done"; conversationId: string; turnId: string }
  | { kind: "error"; code: string; message: string; retryable: boolean };

export type ToolName =
  | "add_node"
  | "add_pipe"
  | "update_node"
  | "delete_node"
  | "validate";`;

const PLAN_EVAL_PY = `# agents/plan_evaluator.py
def evaluate_plan(
    plan_text: str,
    existing_nodes_count: int,
    existing_pipes_count: int,
) -> EvalResult:
    """Deterministic gate. Returns ok=False if the model planned to do
    something the contract does not allow. Reads no model, calls no API.
    """
    reasons: list[str] = []

    if not plan_text or len(plan_text.strip()) < 10:
        reasons.append("plan_too_short")

    if len(plan_text) > 2000:
        reasons.append("plan_too_long")

    banned = ("platform", "solution", "leverage", "empower", "seamless",
              "unlock", "robust", "holistic", "cutting-edge",
              "world-class", "best-in-class")
    lowered = plan_text.lower()
    if any(word in lowered for word in banned):
        reasons.append("banned_word")

    # No-op short-circuit: the model said it has nothing to do.
    is_no_op = (
        existing_nodes_count > 0
        and "no changes" in lowered
    )

    return EvalResult(
        ok=len(reasons) == 0,
        reasons=reasons,
        is_no_op=is_no_op,
    )`;

const CURL_PLAN_ONLY = `# Ask the agent to plan but not build.
curl -N -X POST https://pipes.app/api/agent/build \\
  -H "Content-Type: application/json" \\
  --cookie "__session=$CLERK_SESSION" \\
  --data '{
    "systemId": "sys_kf8a2",
    "prompt": "An inbound webhook fans out to two enrichment workers.",
    "planOnly": true
  }'`;

const TURN_PERSIST_TS = `// convex/app.ts (excerpt)
// One turn, append-only.
export const recordTurnMeta = mutation({
  args: {
    turnId: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db
      .query("agent_turns")
      .withIndex("by_turn_id", (q) => q.eq("turnId", args.turnId))
      .unique();
    if (turn === null) return;
    if (turn.completedAt !== null) return; // append-only after done
    await ctx.db.patch(turn._id, {
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      costUsd: args.costUsd,
    });
  },
});`;

function PostBody() {
  return (
    <BlogProse>
      <P>
        We rewrote the agent twice before we kept the third version. The
        first version called tools as the model talked. The second buffered
        the calls and shipped them as a batch. The third did neither. It
        plans first, the plan passes a gate, then the tools fire. This
        post is what changed and why.
      </P>

      <H2 id="the-bug">The bug we kept hitting</H2>
      <P>
        The model would draw a graph that looked right and connect a port
        that did not exist. Or it would name a node <Inline>Output</Inline>{" "}
        and then name a second one <Inline>Output</Inline>. Or it would
        loop. Or it would call <Inline>add_pipe</Inline> before the node
        it referenced existed. We caught these as schema errors at flush
        time and the canvas would settle on a half-drawn graph. The user
        watched the wrong thing get built.
      </P>
      <P>
        Streaming tool calls made the bug worse. Once you commit to{" "}
        <Inline>add_node</Inline> on event one, you cannot un-commit on
        event two when the model changes its mind. The only fix that
        actually held was to ask the model to say the whole thing out loud
        before any tool fires. So we did that.
      </P>

      <H2 id="the-contract">The five-step contract</H2>
      <P>
        The agent has five tools. <Inline>add_node</Inline>,{" "}
        <Inline>add_pipe</Inline>, <Inline>update_node</Inline>,{" "}
        <Inline>delete_node</Inline>, <Inline>validate</Inline>. The
        contract for a turn is:
      </P>
      <OL>
        <LI>
          <Strong>Read.</Strong> The runner hydrates the current graph
          into a Python <Inline>GraphState</Inline> and renders the system
          prompt with the user&apos;s prompt and any prior turns.
        </LI>
        <LI>
          <Strong>Plan.</Strong> The model writes a short plan in prose
          and, at the end of the message, fences a JSON block listing the
          tool calls it intends to make. We strip the fenced JSON off the
          tail and emit the prose to the user.
        </LI>
        <LI>
          <Strong>Gate.</Strong> The plan passes through{" "}
          <Inline>evaluate_plan</Inline>. If it fails, we ask once more
          and re-evaluate. A second failure ends the turn with a{" "}
          <Inline>plan_rejected</Inline> error.
        </LI>
        <LI>
          <Strong>Execute.</Strong> The steps run in order. Each step
          passes through <Inline>evaluate_action</Inline> against the
          live in-memory state before the tool fires.
        </LI>
        <LI>
          <Strong>Settle.</Strong> The runner emits a single{" "}
          <Inline>meta</Inline> event with cost and call count, then a
          terminal <Inline>done</Inline>.
        </LI>
      </OL>
      <P>
        The user sees beat 2 in the chat as a streamed message and beat 4
        on the canvas. If <Inline>planOnly</Inline> is set on the
        request, we stop after beat 3 and the client renders the plan as
        an editable list. The user accepts, edits, or rejects.
      </P>

      <H2 id="json-fence">Parsing the plan off the message tail</H2>
      <P>
        We told the model to write its plan as prose and finish with a
        fenced JSON block. We did not ask it to send the JSON as a
        separate event. The plan and the structured steps travel in the
        same message text. That choice traded a little parsing for a lot
        of robustness: when the model decides to skip the JSON, we still
        have a human-readable plan to show.
      </P>
      <P>
        The parser is conservative. It looks for the last fenced{" "}
        <Inline>{`\`\`\`json`}</Inline> block in the message. If the block
        parses to an object with a <Inline>steps</Inline> array, we keep
        it. If anything else, we drop it and fall back to a model-driven
        execution loop. The strip cuts the JSON out of the prose before
        the message goes on the wire so the user never sees the raw
        block.
      </P>

      <H2 id="the-events">Six SSE events on the wire</H2>
      <P>
        The streaming surface is six events. The route handler converts
        every internal step into one of these and writes it as a Server-
        Sent Event frame. The client appends each event to a typed union
        and updates state in one place.
      </P>
      <DocsCodeBlock
        language="ts"
        filename="src/lib/agent/events.ts"
        code={EVENT_TYPES_TS}
      />
      <P>
        The two we added for the plan-first flow are{" "}
        <Inline>plan_proposal</Inline> and <Inline>meta</Inline>. The first
        carries the structured steps. The second carries cost. Both are
        terminal-adjacent: <Inline>plan_proposal</Inline> always follows
        the plan message, <Inline>meta</Inline> always precedes{" "}
        <Inline>done</Inline>. Ordering is locked so the client can
        narrow types as it reads.
      </P>

      <H2 id="eval-gates">Two eval gates, deterministic</H2>
      <P>
        The model gets to write the plan. It does not get to decide
        whether the plan is allowed. That call belongs to a deterministic
        gate that runs in Python, reads no model, and returns in
        microseconds. There are two of these:{" "}
        <Inline>evaluate_plan</Inline> and <Inline>evaluate_action</Inline>.
      </P>
      <DocsCodeBlock
        language="ts"
        filename="agents/plan_evaluator.py"
        code={PLAN_EVAL_PY}
      />
      <P>
        The plan gate checks for length, banned words from{" "}
        <Inline>docs/audience.md</Inline>, and a no-op short-circuit when
        the model says it has nothing to do on a non-empty graph. The
        action gate runs before each tool call and checks that the tool
        is in scope, that <Inline>add_pipe</Inline> references nodes that
        already exist or were just added in this turn, and that{" "}
        <Inline>delete_node</Inline> does not race an in-flight update.
        If either gate rejects, the runner emits a skip message and
        carries on. Wholesale plan rejection ends the turn.
      </P>
      <Quote>
        The model writes the words. The gate decides whether the words
        are allowed.
      </Quote>

      <H2 id="cost-meta">Carrying cost on the meta event</H2>
      <P>
        We chose to put cost on its own event right before{" "}
        <Inline>done</Inline> rather than attaching it to{" "}
        <Inline>done</Inline> directly. Two reasons. First,{" "}
        <Inline>done</Inline> stays a clean signal that the connection is
        about to close. The client uses it to clear its{" "}
        <Inline>aborted</Inline> state and unbind the AbortController.
        Second, cost is optional. When the provider does not surface a
        usage block we skip the <Inline>meta</Inline> event entirely
        rather than emit a misleading $0 record.
      </P>
      <P>
        The cost calculation lives in <Inline>cost_table.py</Inline>. It
        is a pure lookup keyed on provider plus model. We do not ask the
        provider for a price because providers change pricing more often
        than they change wire formats.
      </P>
      <P>
        The route handler persists the meta into Convex right before
        closing the stream. The mutation is append-only and bails out if
        the turn was already marked done by an earlier write. That keeps
        the row honest if the client reconnects and a stale stream tries
        to write a second time.
      </P>
      <DocsCodeBlock
        language="ts"
        filename="convex/app.ts"
        code={TURN_PERSIST_TS}
      />

      <H3>Plan-only requests</H3>
      <P>
        The same route handles a plan-only request. The flag changes one
        thing: after the plan passes the gate, the runner emits{" "}
        <Inline>plan_proposal</Inline> and <Inline>done</Inline> without
        running any tools. The client then shows the plan in an editor
        and POSTs the edited step list back as{" "}
        <Inline>execute_steps</Inline> on a follow-up turn. The runner
        skips planning entirely and runs the approved list.
      </P>
      <DocsCodeBlock
        language="bash"
        filename="plan-only.sh"
        code={CURL_PLAN_ONLY}
      />

      <H2 id="whats-open">What is still open</H2>
      <P>
        The plan-first flow is honest about the model. It is not honest
        about diffs. When the model proposes a five-step plan and the
        user wants to change two of them, the user sees a flat list. They
        do not see which two would have run differently from the
        previous turn. We want a real diff-of-plan UX before we call
        this feature shipped, and we do not have a good answer yet.
        Strikethroughs on changed lines is the obvious thing. We have
        not tested it.
      </P>
      <UL>
        <LI>
          The gate set is small on purpose. We will not grow it until we
          find a bug in production that needs the check. A wall of gates
          is its own kind of bug.
        </LI>
        <LI>
          The plan parser is fragile to models that write multiple JSON
          blocks. We pick the last and ignore the rest. A future model
          will outsmart this and we will write a better parser.
        </LI>
        <LI>
          We have no third eval that tests the built graph against a
          simulation. That is the next thing we want to build, and it is
          the subject of a separate post.
        </LI>
      </UL>
      <P>
        The work we have done so far cut the rate of half-drawn canvases
        by a lot. We can not give a number because we did not measure
        the bad version with telemetry; the new version was good enough
        that we shipped before we instrumented the gap. Next time we
        will measure first. The lesson is older than this codebase.
      </P>
    </BlogProse>
  );
}

export const post: BlogPost = {
  slug: "plan-first-agent",
  title: "How we built the plan-first agent",
  excerpt:
    "We rewrote the agent twice before we kept the third version. The third one writes the plan, the plan passes a gate, then the tools fire. Here is what changed and why.",
  author: {
    name: "Mira Patel",
    role: "Staff engineer, Looper",
  },
  date: "2026-04-08",
  tags: ["Engineering", "Agent"],
  readingTimeMin: 8,
  body: PostBody,
};
