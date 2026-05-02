# Audience

This document names the one person Pipes is built for. Every screen, headline, starter, and API surface cites this file. If a feature does not serve the user named here, it does not ship.

## The user

The staff engineer shipping a multi-agent system to production who is tired of drawing architecture by hand and re-explaining it in every chat.

## The job to be done

Stop drawing systems. Describe the system in a sentence and iterate the graph in conversation.

## Rejection criteria - the three users we are NOT for

- The PM exploring AI for their team. They want a deck and a roadmap. We do not write decks.
- The solo hacker prototyping in a notebook. They want code that runs tonight, not a graph their team will read tomorrow. We slow them down on purpose.
- The C-level evaluator cataloging the whole company. They want a CMDB and a compliance export. We are a tool for the team shipping next week, not the office filing the annual review.

## The headline

Describe your system. Watch it build itself.

## The 30-second answer

Pipes is a conversation surface for the architecture you are shipping. You describe the system in plain text. The agent draws the nodes, ports, and pipes on the canvas in front of you. You correct it the way you correct a teammate. Your team reviews the graph. Any agent you hand a token reads the same graph through one protocol. You stop drawing. You stop re-explaining.

## Voice rules

- One idea per sentence. If it has three commas, cut it.
- Banned words: platform, solution, leverage, empower, seamless, unlock, robust, holistic, cutting-edge, world-class, best-in-class.
- Verbs over nouns. Describe, draw, correct, hand off, read. Not design, integration, execution, orchestration.
- ASCII only. No curly quotes, no em-dashes, no emoji.
- The headline appears verbatim on the homepage hero, in the editor empty state where the prompt input lives, and in the marketing footer.
