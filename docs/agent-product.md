# Agent-driven Pipes

Pipes is no longer a drafting tool. It is a conversation surface for the architecture you are shipping. The headline is now "Describe your system. Watch it build itself."

## The shift in one sentence

Before: the user draws the graph. After: the user describes the system and watches the graph appear.

## What is invisible

- The agent. The user never says "use the agent." They use Pipes.
- The model. The user never picks "GPT-4 vs GPT-4 mini." Pipes picks.
- The sandbox. The user never sees Modal. They see the canvas change.

## What is the user-facing primitive

The conversation. One thing. The canvas, the inspector, and the starters all reorganize around the conversation as the front door. The prompt input is the empty state. The prompt input is the new-system flow. The prompt input is how you edit.

## The 5 tools the agent has (locked)

The agent has exactly five tools in v1, dispatched through the existing MCP layer:

- add_node
- add_pipe
- update_node
- delete_node
- validate

That is the full surface. No browse, no search, no fork, no rename-system, no import. Any expansion happens after v1 ships and only if a paying user asks for it twice.

## What dies in v1

- The "+ Add node" button as a primary action. Manual add becomes a power-user fallback in a context menu.
- The library palette as a discovery surface. The agent picks what to add. The library is gone from the hero of the editor.
- Templates as forkable graphs. They become "starters" - prompt strings that pre-fill the conversation. The graph that loads is what the agent built from that prompt.
- The empty-canvas-with-instructions empty state. The empty state is the prompt input.
- The "+ New system" CTA on the dashboard as a route to a blank graph. It now routes to a fresh canvas focused on the prompt input.

## What does NOT change

- The pipes_schema_v1 graph format. Same schema. Same MCP-readability. Same export.
- The Convex persistence layer. Same.
- Manual editing. Still works. The agent and the user write through the same optimistic queue.
- Mock mode. Still boots without Modal or OpenAI keys.
- Clerk auth. Same.
- The token-scoped MCP read surface. Same. External agents still read the graph the agent built the same way they read a graph the user drew.

## V1 cost decision (cold starts accepted)

V1 ships WITHOUT warm pools. Modal cold starts of roughly 200 to 800 milliseconds will be visible to the user as a brief "Building..." status on the canvas. We will revisit warming after the product has paying users. This is a deliberate trade-off. We will not optimize a UX detail until we know users are willing to pay for it. Cold start is not a bug in v1. It is the price of shipping.

## What "looks Apple" about this

- The agent is invisible. The user never names it.
- The chat is the input, not a panel. There is no second window.
- One Cmd-Z undoes an entire agent turn, not one node at a time.
- Manual user edits always win mid-build. If the user grabs a node, the agent yields.
- Streaming animations are 80 to 120 milliseconds per beat. Fast, not entertaining.
- The starter is a sentence, not a thumbnail grid. The user reads one line and presses return.
- The first thing a new user sees on the canvas is the same thing the millionth user sees: a prompt input and the headline above it.
