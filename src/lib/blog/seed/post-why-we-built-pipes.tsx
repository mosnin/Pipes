import {
  BlogProse,
  H2,
  P,
  UL,
  LI,
  Quote,
  Inline,
  Strong,
} from "@/components/marketing/BlogProse";
import type { BlogPost, BlogTocEntry } from "@/lib/blog/types";

/**
 * Post: Why we built Looper.
 *
 * Origin story. Locked voice. No hype. Specific about what changed.
 */

export const toc: ReadonlyArray<BlogTocEntry> = [
  { id: "the-pattern", label: "The pattern we kept seeing" },
  { id: "the-thesis", label: "The thesis" },
  { id: "the-bet", label: "The bet: graphs plus a protocol" },
  { id: "the-team", label: "The team" },
  { id: "whats-next", label: "What is next" },
];

function PostBody() {
  return (
    <BlogProse>
      <P>
        The bug we are fixing is older than agents. Every team I have
        worked on draws the same diagram three times. Once on a
        whiteboard in week one. Once in a doc in month two when a new
        hire needs it. Once in a Notion page in quarter three when the
        deck for the board review needs it. The diagrams drift. They are
        never the same diagram. They are also never the system.
      </P>
      <P>
        When the agents arrived, the same bug arrived louder. Now we had
        to re-explain the system to a new model in a new chat every time
        we wanted help. The diagram was on a whiteboard in a different
        room. The model could not read whiteboards.
      </P>

      <H2 id="the-pattern">The pattern we kept seeing</H2>
      <P>
        I watched four teams ship four versions of the same system in
        2024 and 2025. Each one had a graph in their head. None of them
        could hand the graph to a teammate without an hour of context.
        None of them could hand the graph to an agent without a long
        prompt and a fresh chat. Three of the four had drawn the same
        boxes in three different tools. Two of the four had a CMDB
        somewhere that nobody opened.
      </P>
      <P>
        The complaint we kept hearing was not about the agents. It was
        about the explaining. A staff engineer told me, word for word:
        <Strong> the worst part of my week is re-explaining the system
        on a Tuesday.</Strong>
      </P>
      <Quote>
        Re-explaining is the bug. We were building tools that made the
        explaining faster. We needed a tool that removed it.
      </Quote>

      <H2 id="the-thesis">The thesis</H2>
      <P>
        A system is a graph of nodes and pipes. Inputs come in, work
        happens, results go out. Agents that touch the system need the
        same graph the humans on the team see. The graph cannot live in
        a deck. The graph cannot live in a head. The graph has to be the
        thing the team and the agents both read.
      </P>
      <P>
        So we built a conversation surface for the architecture you are
        shipping. You describe the system in a sentence. The canvas draws
        it. You correct the canvas the way you correct a teammate. The
        graph becomes the artifact that survives the conversation. Any
        agent you hand a token reads the same graph through one
        protocol.
      </P>
      <P>
        The headline came out of this exercise: <Strong>describe your
        system, watch it build itself.</Strong> It is not a tagline. It is
        the literal job to be done. We refused to ship anything that did
        not move that sentence forward.
      </P>

      <H2 id="the-bet">The bet: graphs plus a protocol</H2>
      <P>
        There are two ideas we are betting on. Both are stubborn.
      </P>
      <P>
        First, the schema is fixed. The graph is{" "}
        <Inline>looper_schema_v1</Inline>. There are 27 node types. Every
        export, every import, every model call, every protocol read goes
        through the same Zod schema. We will version the schema before
        we add a 28th node type, and the migration map lives in
        <Inline> src/domain/looper_schema_v1/migration.ts</Inline>. The
        cost of fixing the format is that a graph drawn today still reads
        in a year. The cost of letting it drift is the bug we set out to
        fix.
      </P>
      <P>
        Second, the protocol is the integration. We do not ship
        connectors. We do not ship a marketplace. We ship a single
        Bearer-token-authenticated MCP endpoint that any agent can read
        and write through. The token scopes to a capability. The
        capability scopes to a system. The agent reads the same graph
        the team reviews. We refuse to grow the API beyond the
        capabilities the graph already names.
      </P>
      <UL>
        <LI>
          <Strong>One format.</Strong> Every export is{" "}
          <Inline>looper_schema_v1</Inline> JSON. No proprietary wrappers.
        </LI>
        <LI>
          <Strong>One protocol.</Strong> MCP over HTTP. Bearer auth.
          Capability-scoped tokens. SHA-256 hashed before storage.
        </LI>
        <LI>
          <Strong>Five tools.</Strong> The agent uses{" "}
          <Inline>add_node</Inline>, <Inline>add_pipe</Inline>,{" "}
          <Inline>update_node</Inline>, <Inline>delete_node</Inline>,
          <Inline> validate</Inline>. That is the full surface.
        </LI>
        <LI>
          <Strong>Five plans for nodes.</Strong> The Inspector schema is
          typed per node. The agent and the human edit through the same
          typed fields.
        </LI>
      </UL>
      <P>
        We considered a freer schema. We tried a freer schema for two
        weeks. It collapsed. Every agent we plugged in needed a
        different translation layer and no two agents drew the same
        diagram from the same prompt. Once we fixed the schema, the
        translation layer disappeared and the diagrams stopped drifting.
      </P>

      <H2 id="the-team">The team</H2>
      <P>
        We are a small team of engineers who have built more multi-agent
        systems than we would like to admit. Half of us have shipped
        agents to production at other companies. Half of us came from
        graph databases and editor tooling. We share an allergy to
        decks. We do not write decks. We write code that runs and graphs
        that read.
      </P>
      <P>
        The product we want to build is the product we wanted to use
        last year. We are dogfooding it now. We use Looper to describe
        Looper. The graph is checked into the repo and the agent edits
        it in conversation when we add a node type. When we got tired of
        the editor for a feature, we changed the editor. When we got
        tired of the canvas for a beat, we changed the canvas.
      </P>

      <H2 id="whats-next">What is next</H2>
      <P>
        The thing we are working on in the open right now is the plan-
        first agent. It is the topic of another post in this feed. The
        thing we are working on in private is closing the loop between
        the graph and a sandboxed run. We want the agent to be able to
        kick off a real run of the system it just drew and bring the
        evidence back. We are not there yet. We are weeks, not days.
      </P>
      <P>
        We are also taking customers. If you are a staff engineer
        shipping a multi-agent system and you are tired of drawing the
        diagram three times, write to us. We will hand you a token. You
        will hand the token to your agent. The agent will read the graph
        you drew. The diagram will stop drifting.
      </P>
      <P>
        That is the only outcome we are optimizing for. Less re-
        explaining. More shipping.
      </P>
    </BlogProse>
  );
}

export const post: BlogPost = {
  slug: "why-we-built-pipes",
  title: "Why we built Looper",
  excerpt:
    "Re-explaining the system to every model in every chat is the bug. The diagram is the artifact that should survive the conversation. This is the origin story.",
  author: {
    name: "Devansh Rao",
    role: "Founder, Looper",
  },
  date: "2025-12-12",
  tags: ["Company"],
  readingTimeMin: 6,
  body: PostBody,
};
