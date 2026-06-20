import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { InlineCode } from "@/components/ui";
import { DocsSection, DocsHeading } from "@/components/marketing/DocsSection";
import { DocsCodeBlock } from "@/components/marketing/DocsCodeBlock";
import { DocsCallout } from "@/components/marketing/DocsCallout";
import { DocsTopicLayout, type DocsTopicNeighbor } from "@/components/marketing/DocsTopicLayout";
import { nodeTypeValues } from "@/domain/looper_schema_v1/schema";

// Ordered topic slugs. Order drives prev/next navigation.
const ORDER = ["editor", "schema", "versions", "review", "tokens", "import-export"] as const;
type Topic = (typeof ORDER)[number];

type TopicContent = {
  eyebrow: string;
  title: string;
  intro: string;
  body: ReactNode;
};

const TOPICS: Record<Topic, TopicContent> = {
  editor: {
    eyebrow: "Editor",
    title: "The editor",
    intro: "Draw, drag, and type. The canvas is your authoring surface and it validates as you build.",
    body: (
      <>
        <DocsSection id="canvas" title="The canvas">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            The canvas is where a loop takes shape. Pan with two fingers or the
            space bar; zoom with the trackpad or <InlineCode>Cmd+/-</InlineCode>.
            Press <InlineCode>F</InlineCode> to fit the whole graph in view.
          </p>
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Selection is sticky. Click a node to open the inspector and keep it
            open as you edit. Shift-click to multi-select; drag on empty space to
            box-select. Two or more selected nodes can be grouped into a
            subsystem.
          </p>
        </DocsSection>
        <DocsSection id="describe" title="Describe, do not draw">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            The fastest way to start is the chat input, not the node palette.
            Type a sentence and the agent draws the first pass. You correct it by
            typing again, or by grabbing nodes directly. Manual edits always win.
          </p>
          <DocsCodeBlock
            language="text"
            code={`A crawler reads URLs from a queue, a summarizer turns each page into a paragraph, and a writer drops the paragraphs into storage.`}
          />
        </DocsSection>
        <DocsSection id="inspector" title="The inspector">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            The inspector renders a typed form for the selected node. Each node
            type ships with a config schema, so the form is generated, not
            hand-built. No free-form JSON.
          </p>
          <DocsCallout tone="tip" title="One agent turn, one undo">
            Every agent turn collapses into a single undo. Press{" "}
            <InlineCode>Cmd+Z</InlineCode> once to revert a whole build, not one
            node at a time.
          </DocsCallout>
        </DocsSection>
      </>
    ),
  },
  schema: {
    eyebrow: "Schema",
    title: "The schema",
    intro: `Every loop is one typed document. ${nodeTypeValues.length} node kinds, typed pipes, and a canonical export format.`,
    body: (
      <>
        <DocsSection id="node-types" title="Node kinds">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Looper ships with {nodeTypeValues.length} typed node kinds, from{" "}
            <InlineCode>Agent</InlineCode> and <InlineCode>Tool</InlineCode> to
            loop-native steps like <InlineCode>LoopControl</InlineCode>,{" "}
            <InlineCode>Checkpoint</InlineCode>, <InlineCode>Evaluator</InlineCode>,
            and <InlineCode>HumanReview</InlineCode>. Each kind has a known shape,
            so the editor and any agent read it the same way.
          </p>
          <DocsCodeBlock
            language="text"
            code={nodeTypeValues.join("  ")}
          />
        </DocsSection>
        <DocsSection id="pipes" title="Typed pipes">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            A pipe connects an output port on one node to an input port on
            another. The two ports carry types; the validator surfaces a mismatch
            inline, before anything runs.
          </p>
        </DocsSection>
        <DocsSection id="canonical" title="The canonical format">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            The export format is <InlineCode>looper_schema_v1</InlineCode>, a JSON
            document validated by a strict schema. It is the source of truth: the
            editor renders it, the protocol serves it, and migrations move old
            documents forward.
          </p>
          <DocsCallout tone="info" title="Versioned on purpose">
            The schema carries a version. New versions ship with a migration so
            an old export always opens cleanly.
          </DocsCallout>
        </DocsSection>
      </>
    ),
  },
  versions: {
    eyebrow: "Versions",
    title: "Versions",
    intro: "Snapshot a loop, promote what works, and roll back what does not. History is a first-class object.",
    body: (
      <>
        <DocsSection id="snapshot" title="Snapshot the graph">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            A version is a named snapshot of the whole loop at a point in time.
            Take one before a risky change, after a milestone, or whenever you
            want a point you can return to. Versions are immutable.
          </p>
        </DocsSection>
        <DocsSection id="promote" title="Promote and roll back">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Promote a version to make it the one your team and your agents read.
            Roll back by promoting an earlier one. The graph never loses history;
            it just changes which snapshot is current.
          </p>
          <DocsCallout tone="tip" title="Diff before you promote">
            The version view shows what changed between any two snapshots, by
            node and pipe, so a promote is never a surprise.
          </DocsCallout>
        </DocsSection>
        <DocsSection id="protocol" title="Over the protocol">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Agents can snapshot too. The <InlineCode>create_version</InlineCode>{" "}
            tool requires the <InlineCode>versions:write</InlineCode> capability,
            so a CI job can checkpoint a loop before it makes changes.
          </p>
        </DocsSection>
      </>
    ),
  },
  review: {
    eyebrow: "Review",
    title: "Review on the graph",
    intro: "Comment on any node. Review happens where the system lives, not in a thread no one can find later.",
    body: (
      <>
        <DocsSection id="comment" title="Comment on a node">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Select a node and leave a comment on it. The comment is anchored to
            that node by id, so the conversation stays attached to the part of the
            system it is about, even as the graph changes around it.
          </p>
        </DocsSection>
        <DocsSection id="proposals" title="Agent proposals">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            An agent can propose an edit instead of applying it. Proposed steps
            appear as ghost nodes on the canvas for a human to accept or dismiss.
            Destructive changes are held for review by default.
          </p>
          <DocsHeading id="review-flow" level={3}>
            The flow
          </DocsHeading>
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Propose, review, accept. The agent suggests; a person decides. The
            graph is the contract, and a change to the contract is a decision a
            human can see and reverse.
          </p>
        </DocsSection>
        <DocsSection id="capabilities" title="Scoped to write">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Commenting over the protocol requires the{" "}
            <InlineCode>comments:write</InlineCode> capability. A read-only token
            can see the graph but cannot leave a mark on it.
          </p>
        </DocsSection>
      </>
    ),
  },
  tokens: {
    eyebrow: "Tokens",
    title: "Tokens",
    intro: "Hand any agent a key. Capability-scoped tokens let Claude, GPT, or your own runtime read and edit the same loop.",
    body: (
      <>
        <DocsSection id="generate" title="Generate a token">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Mint a token from <InlineCode>Settings &gt; Developer</InlineCode>.
            The raw secret is shown exactly once and stored only as a SHA-256
            hash. Lose it and you mint a new one. Tokens begin with{" "}
            <InlineCode>ptk_</InlineCode>.
          </p>
        </DocsSection>
        <DocsSection id="scope" title="Scope to the smallest blast radius">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            A token carries an explicit capability set. Grant only what the job
            needs. A CI validator wants <InlineCode>systems:read</InlineCode> and{" "}
            <InlineCode>validation:read</InlineCode> and nothing else.
          </p>
          <DocsCodeBlock
            language="http"
            code={`POST /api/protocol/mcp
Authorization: Bearer ptk_live_replace_me
Content-Type: application/json

{ "tool": "get_system", "input": { "systemId": "sys_..." } }`}
          />
        </DocsSection>
        <DocsSection id="use" title="Paste it into any agent">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            In Claude Projects or Claude Code, add the token under your MCP
            server config. In any other framework, pass it as a Bearer header on
            every request to <InlineCode>/api/protocol/mcp</InlineCode>.
          </p>
          <DocsCallout tone="tip" title="Rotate, do not share">
            Treat tokens like ssh keys. One per agent, one per CI job. Revocation
            is instant; the next request after a revoke returns 401.
          </DocsCallout>
        </DocsSection>
      </>
    ),
  },
  "import-export": {
    eyebrow: "Import and export",
    title: "Import and export",
    intro: "Read your graph anywhere. Export the canonical JSON, import it back, or move a loop between workspaces.",
    body: (
      <>
        <DocsSection id="export" title="Export the canonical JSON">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Export any loop as a <InlineCode>looper_schema_v1</InlineCode> JSON
            document. It contains every node, pipe, and config: the complete,
            portable definition of the system. Nothing is hidden in the UI.
          </p>
          <DocsCodeBlock
            language="json"
            code={`{
  "looper_schema_v1": {
    "system": { "name": "Inbound research", "version": "v3" },
    "nodes": [ /* typed nodes */ ],
    "pipes": [ /* typed connections */ ]
  }
}`}
          />
        </DocsSection>
        <DocsSection id="import" title="Import a document">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Paste a schema document into the import dialog and Looper creates a
            new loop from its contents. Validation runs on import; any error is
            shown in the editor so you fix it before you build on top of it.
          </p>
        </DocsSection>
        <DocsSection id="protocol" title="Over the protocol">
          <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
            Agents import and export too. <InlineCode>export_system_schema</InlineCode>{" "}
            needs <InlineCode>schema:read</InlineCode>;{" "}
            <InlineCode>create_system_from_schema</InlineCode> needs{" "}
            <InlineCode>import:write</InlineCode>. The same document round-trips
            cleanly between the editor and any agent.
          </p>
          <DocsCallout tone="info" title="One format, everywhere">
            The export you download by hand and the one an agent reads over the
            protocol are byte-for-byte the same shape.
          </DocsCallout>
        </DocsSection>
      </>
    ),
  },
};

const LABELS: Record<Topic, string> = {
  editor: "The editor",
  schema: "The schema",
  versions: "Versions",
  review: "Review on the graph",
  tokens: "Tokens",
  "import-export": "Import and export",
};

export function generateStaticParams() {
  return ORDER.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const content = TOPICS[topic as Topic];
  if (!content) return { title: "Docs - Looper" };
  return { title: `${content.title} - Looper Docs`, description: content.intro };
}

export default async function DocsTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const content = TOPICS[topic as Topic];
  if (!content) notFound();

  const idx = ORDER.indexOf(topic as Topic);
  const prevSlug = idx > 0 ? ORDER[idx - 1] : undefined;
  const nextSlug = idx < ORDER.length - 1 ? ORDER[idx + 1] : undefined;
  const prev: DocsTopicNeighbor | undefined = prevSlug
    ? { href: `/docs/${prevSlug}`, label: LABELS[prevSlug] }
    : undefined;
  const next: DocsTopicNeighbor | undefined = nextSlug
    ? { href: `/docs/${nextSlug}`, label: LABELS[nextSlug] }
    : undefined;

  return (
    <DocsTopicLayout
      eyebrow={content.eyebrow}
      title={content.title}
      intro={content.intro}
      prev={prev}
      next={next}
    >
      {content.body}
    </DocsTopicLayout>
  );
}
