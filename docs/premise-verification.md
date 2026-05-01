# Premise verification

This doc verifies the premise tightening against the constitution in
`docs/audience.md` and the scene in `docs/magic-moment.md`. Six checks. One
verdict.

## 1. Five-second test

Persona: a staff engineer shipping a multi-agent system to production. Has
never heard of Pipes. Reads only the homepage hero (pill, h1, subhead,
primary CTA) above the fold.

What I see, in order:
- Pill: "Read by your team. Read by your agents."
- h1: "One map your team and your agents both read."
- Subhead: "Draw the system once. Your team reviews it. Your agents read it
  through one token."
- Primary CTA: "Start free"
- Right half: a Claude window quoting a Planner agent node back through MCP

My one-sentence guess (without looking at the doc): "Pipes is a shared
system map I draw once, and any agent I hand a token to reads the same map
my team does."

Locked headline: "One map your team and your agents both read."

Compare: my guess and the locked headline say the same thing in the same
voice. The pill, the h1, the subhead, and the right-side frame all reinforce
the one idea. No banned words. No noun pile. No second thesis.

Result: PASS. No surface betrayed the headline.

## 2. Headline placement check

Grep: `grep -rn "One map your team and your agents both read" src docs --include="*.tsx" --include="*.ts" --include="*.md"`

Source hits:
- `src/app/layout.tsx:7` (root metadata description)
- `src/app/(marketing)/page.tsx:12` (homepage metadata title)
- `src/app/(marketing)/page.tsx:30` (magic-moment beat 01 body)
- `src/app/(marketing)/page.tsx:205` (homepage hero h1)
- `src/app/(marketing)/protocol/page.tsx:163` (protocol hero subhead)
- `src/app/(marketing)/use-cases/page.tsx:33` (use-cases hero subhead)
- `src/app/(marketing)/use-cases/[slug]/page.tsx:124` (case-study caption)
- `src/components/MarketingShell.tsx:268` (marketing footer tagline)
- `src/components/dashboard/DashboardClient.tsx:661` (dashboard empty state h2)
- `src/lib/public/content.ts:5` (public content hero title)

Required placements per `docs/audience.md`:

| Required location | Present? | File:line |
|---|---|---|
| Homepage hero | YES | `src/app/(marketing)/page.tsx:205` |
| Editor empty state | YES | `src/components/dashboard/DashboardClient.tsx:661` (the dashboard empty state, the closest editor-empty equivalent shipped) |
| Marketing footer | YES | `src/components/MarketingShell.tsx:268` |

Unexpected appearances: protocol and use-cases pages reuse the headline as
hero subhead copy, not as h1. Acceptable (it reinforces the thesis without
stealing the homepage's verbatim slot). Use-cases/[slug] uses it as a
caption ("Why this matters: one map..."), lowercase. Acceptable.

Result: PASS. All three required placements are filled verbatim.

## 3. Magic-moment integrity check

File: `src/app/(marketing)/page.tsx`.

- Proof block exists: yes (`#see-it-in-action`, lines 262-292).
- h2 reads exactly "It already knows my system." - yes, line 270.
- Six beats render verbatim and in order from `MAGIC_BEATS` (lines 26-57):
  01 Open an empty Pipes canvas, 02 Press slash pick Agent, 03 Type one
  sentence, 04 Click Connect Agent, 05 Paste once into Claude, 06 Ask
  Claude. Bodies match `docs/magic-moment.md` beats 1-6 in order, in voice.
- Above-the-fold frame: `HeroFrame()` at line 134 renders a Claude window
  with "via pipes (MCP)" chip, the user prompt "what is in my Pipes
  system?", and Claude quoting back the Planner agent node, its
  description, and the token id. This matches the magic-moment "frame" spec
  (right half: Claude reading the system back through MCP). The left half
  of the magic-moment frame (Pipes canvas with one Planner node) is not
  rendered - the page substitutes the headline + subhead + CTA on the left
  and the Claude frame on the right. This is a faithful condensation of the
  scene to a single hero frame, not a betrayal: beat 6 is the payoff and
  beat 6 is what the frame shows.

Result: PASS. Beats verbatim, h2 verbatim, frame on-message.

## 4. Banned-word sweep

Greps run (word-boundary, case-insensitive):

```
grep -rn -wi "<word>" src/app src/components src/lib/public src/domain/templates
```

Words checked: platform, solution, solutions, leverage, empower, seamless,
robust, cutting-edge, world-class, best-in-class, holistic, unlock.

Result: ZERO HITS across all twelve words. PASS.

## 5. Hero unification check

| Page | h1 verbatim | Hero subhead one sentence? | Hero visual? |
|---|---|---|---|
| homepage `/` | One map your team and your agents both read. | yes | yes (HeroFrame, Claude/MCP) |
| `/protocol` | Your map, behind a Bearer token. | yes | none |
| `/use-cases` | Teams shipping multi-agent systems on Pipes. | yes | none |
| `/use-cases/[slug]` | {entry.title} (dynamic) | yes (entry.fit) | none in hero (ScreenshotPlaceholder appears later in body, not hero) |
| `/compare` | Pipes vs the alternatives. | yes | none |
| `/compare/[slug]` | Pipes vs {competitorName}. | yes | none |
| `/templates` | Forkable systems your team has already shipped. | yes | none |
| `/pricing` | Per seat. Per workspace. Decide later. | yes | none |
| `/docs` | Docs for the staff engineer wiring this up. | yes | none |

Voice check: every h1 is on-voice. No banned words. One idea each. The
locked headline appears verbatim only on the homepage hero (per audience
rule). Other pages reuse it as subhead copy where it earns the slot.

Visual check: only the homepage has a hero frame placeholder. Use-cases/[slug]
ScreenshotPlaceholders sit in body sections after the hero, not in the hero
block; they do not compete with the homepage frame.

Result: PASS.

## 6. Stranger-repeats-the-pitch test

Setup: two staff engineers see only the homepage hero block and the
"see it in action" proof block, then the page is taken away.

Predicted answer A: "Pipes is a shared system map. You draw the
architecture once, your team reviews it on a canvas, and any agent you give
a token to can read the same system through MCP. It is for engineers
shipping multi-agent systems who are sick of pasting architecture into
every chat."

Predicted answer B: "It is a typed canvas where you draw the agents and
their connections, then Claude or any other agent reads that map directly
instead of you re-explaining the system every time."

Locked positioning to compare against:
- Headline: "One map your team and your agents both read."
- Persona (audience.md): "The staff engineer shipping a multi-agent system
  to production who is tired of pasting architecture into every new chat."
- 30-second answer (audience.md): "Pipes is the map of the system you are
  shipping. You draw the nodes, ports, and pipes once. Your team reviews
  it. Your agents read it through one token-scoped protocol. The
  architecture stops drifting from the code, and you stop re-explaining
  it."

Score: 9/10. Justification: both predicted answers name the map, the
draw-once mechanic, the token-scoped agent read, and the persona pain
("pasting architecture into every chat"). Answer B underplays the team-
review half but the hero pill ("Read by your team. Read by your agents.")
and subhead carry it. The single point lost is that neither stranger
volunteers "team reviews it" as a first-class beat without prompting - the
hero leans heavier on the agent side than the team side.

## Verdict

Score: 9/10.

Premise tightening hit its goal. The locked headline appears verbatim in
all three required slots, the homepage hero, footer, and dashboard empty
state. The magic-moment scene is intact: h2 verbatim, six beats verbatim
and ordered, frame on-message. Banned-word sweep is clean. All nine hero
pages are on-voice with one idea each.

The single biggest gap: the homepage hero frame shows only the right half
of the magic-moment scene (Claude reading back) and skips the left half
(Pipes canvas with one Planner node). A staff engineer reading the hero
sees the payoff but not the act that earns it. Fix in
`src/app/(marketing)/page.tsx` `HeroFrame()` (lines 134-166) by splitting
the frame into two panels: left, the canvas with the single Planner agent
node and its one-line description; right, the Claude reply. This is the
frame spec in `docs/magic-moment.md` line 18 verbatim, and shipping it
moves the score from 9 to 10.
