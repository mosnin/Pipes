# Magic moment

This is the 30 seconds we sell to the staff engineer shipping a multi-agent system to production who is tired of drawing architecture by hand. The headline above the scene is "Describe your system. Watch it build itself." This single scene defines the homepage hero, the empty editor, the demo video, and the launch tweet.

## The scene - 30 seconds, beat by beat

1. The engineer opens an empty Pipes canvas and sees one prompt input: "Describe your system. Watch it build itself."
2. They type one sentence: "Planner agent reads tickets, writes a plan, hands off to a coder agent that opens a PR."
3. They press return and see the canvas come alive: the Planner node lands, then the Coder node, then a typed pipe between them, all in under two seconds.
4. They drag the Coder node two inches to the right; the agent yields and the layout holds where they put it.
5. They click the one button in the top right that they will remember afterward: Connect Agent, copy the token-scoped Claude config block, paste it into Claude.
6. They ask Claude "what is in my Pipes system?" and Claude answers by name: Planner agent, Coder agent, the pipe between them, fetched live through the MCP endpoint - they pasted no architecture and they drew no boxes.

The one click they remember is Connect Agent. The thing they will tell another engineer is that they typed a sentence and the system appeared.

## The frame

The hero screenshot is a split frame at the instant beat 6 lands. Left half: the Pipes canvas with the Planner node, the Coder node, and one typed pipe between them, with the user's original sentence visible above the input as a sent message. Right half: a Claude chat window where Claude has just replied, naming both nodes and the pipe, with a small "via pipes (MCP)" tool-call chip above its message. Not in the frame: no inspector tabs, no node palette, no library, no second prompt, no customer logos, no pricing, no Pipes nav chrome beyond the system name in the top left.

## The line

"It already knows my system."

## What this scene replaces

- The homepage hero illustration and copy.
- The protocol page hero and the use-cases page hero.
- The empty editor canvas placeholder, which is now the prompt input itself.
- The dashboard "+ New system" CTA, which now opens directly into a prompt input on a fresh canvas.
- The docs landing illustration.
- The first frame of the demo video and the still in the launch tweet.

## What this scene refuses

- A separate chat window that pops out. The chat is the input and the input is the canvas.
- A diff-review modal showing pending agent changes. The canvas IS the diff. Cmd-Z is the reject.
- Voice input. Engineers type.
- An "agent persona" dropdown or a "model" picker. Pipes picks. The user does not see the engine.
- A node palette or a library shelf in the hero. The agent picks the nodes.
- A second node added by hand before beat 3 lands. The agent draws first.
- A demo video longer than 30 seconds or a voiceover that explains what MCP is.
- Any copy that uses the words platform, solution, seamless, or unlock.
