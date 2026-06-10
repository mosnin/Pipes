# Copy audit

This audit grades every customer-facing string against the locked headline from `docs/audience.md`: "One map your team and your agents both read." The user is the staff engineer shipping a multi-agent system to production, tired of pasting architecture into every new chat. Every string below is judged against fit, voice, and whether it earns its place against that one user.

## The constitution (extracted)

- Persona: The staff engineer shipping a multi-agent system to production who is tired of pasting architecture into every new chat.
- JTBD: Give my team and my agents the same map of the system so I stop being the map.
- Headline: One map your team and your agents both read.
- Voice rules:
  - One idea per sentence. If it has three commas, cut it.
  - Banned words: platform, solution, leverage, empower, seamless, unlock, robust, holistic.
  - Verbs over nouns. Draw, validate, hand off, run. Not design, integration, execution, orchestration.
  - ASCII only. No curly quotes, no em-dashes, no emoji.
  - The headline appears verbatim on the homepage hero, in the editor empty state, and in the marketing footer.

## Findings

### Marketing surface: homepage `src/app/(marketing)/page.tsx`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| page.tsx | 13 | metadata title: "Pipes - System memory for software you ship with agents" | REWRITE | "Pipes - One map your team and your agents both read" |
| page.tsx | 14-15 | metadata desc: "Design, validate, and version the architecture..." | REWRITE | "Draw the system once. Your team reviews it. Your agents read it through one token." |
| page.tsx | 156 | SectionBadge "Now with MCP capability scoping" | KEEP | - |
| page.tsx | 159-165 | hero h1: "System memory for software you ship with agents." | REWRITE | "One map your team and your agents both read." (the locked headline; current line is off-brief) |
| page.tsx | 167-169 | "One typed source of truth your team and your agents both read." | REWRITE | "Draw the nodes, ports, and pipes once. Stop being the map." |
| page.tsx | 178 | CTA "Start building free" | KEEP | - |
| page.tsx | 194-196 | "Free workspace - no credit card required - SOC 2 Type II" | KEEP | - |
| page.tsx | 203-205 | "Trusted by teams shipping production AI systems" | KEEP | - |
| page.tsx | 229-230 | section h2: "From sketch to shipped system in three steps." | KEEP | - |
| page.tsx | 231-234 | "Pipes shortens the loop from architecture diagram to production handoff." | KEEP | - |
| page.tsx | 31 | step 01 body: "Sketch nodes, ports, and pipes on a typed canvas. Promote it to a versioned blueprint in one click." | KEEP | - |
| page.tsx | 41 | step 03 body: "MCP and REST surfaces stream the full system - inputs, outputs, contracts - to Claude, GPT, or your own runtime." | REWRITE | "Hand any agent a token. It reads the system the way your team does." (current has 3+ commas and reads like a brochure) |
| page.tsx | 49 | feature body: "Typed nodes. Typed ports. Typed pipes. Pipes is a canvas built for engineers who think in contracts, not boxes and arrows." | KEEP | - |
| page.tsx | 232 | "Make your architecture executable." | KEEP | - |
| page.tsx | 318 | "Start from a proven blueprint." | KEEP | - |
| page.tsx | 321 | "Battle-tested system shapes you can fork in seconds." | KEEP | - |
| page.tsx | 392-396 | testimonial: "Pipes is the first tool where our architecture diagrams stop drifting from reality. Our agents read the same system our engineers do." | KEEP | - |
| page.tsx | 463 | h2: "Make your architecture executable." | KEEP | - |
| page.tsx | 465-468 | "A free workspace and your first system are two clicks away. Bring your team. Bring your agents." | KEEP | - |
| page.tsx | 492-494 | "Free forever - SOC 2 Type II - SSO available on Enterprise" | KEEP | - |

### Marketing surface: pricing `src/app/(marketing)/pricing/page.tsx`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| pricing/page.tsx | 9-11 | metadata desc: "Transparent, per-workspace pricing. Start free. Upgrade when your team grows." | KEEP | - |
| pricing/page.tsx | 38 | starter tagline: "Explore Pipes and ship your first system." | KEEP | - |
| pricing/page.tsx | 58 | team tagline: "For teams collaborating on shared system memory." | KEEP | - |
| pricing/page.tsx | 79 | enterprise tagline: "For organizations with security, scale, and procurement needs." | REWRITE | "For teams that need SSO, SCIM, and a signed DPA." (verbs and specifics, not noun pile) |
| pricing/page.tsx | 91 | enterprise feature: "Dedicated solutions engineer" | REWRITE | "Dedicated support engineer" (drops banned word `solution`) |
| pricing/page.tsx | 232-233 | h1: "Pricing built for teams, not seat counts." | KEEP | - |
| pricing/page.tsx | 234-236 | "Per-workspace pricing. Start free. Pay only when your team is ready to ship." | KEEP | - |
| pricing/page.tsx | 159-161 | FAQ free answer: "Yes, with no time limit. Build up to 3 systems, run validations, and export locally. Upgrade when you outgrow it." | KEEP | - |
| pricing/page.tsx | 178-180 | FAQ MCP answer: "A token-authenticated MCP and REST surface over the same bounded service layer. External agents and tools can read your system contracts without your team re-prompting them." | KEEP | - |
| pricing/page.tsx | 446-448 | bottom h2: "Ship your first system this week." | KEEP | - |

### Marketing surface: protocol `src/app/(marketing)/protocol/page.tsx`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| protocol/page.tsx | 21-23 | metadata desc: "Token-authenticated MCP and REST surfaces over the Pipes bounded services. Connect any agent to your system memory." | KEEP | - |
| protocol/page.tsx | 162-166 | h1: "One bounded service layer. Two transports. Eleven capabilities." | KEEP | - |
| protocol/page.tsx | 167-171 | "Token-authenticated REST and MCP surfaces over the same audited service layer that powers the editor. Connect agents, CI pipelines, and integrations without re-implementing access control." | REWRITE | "The same service layer that powers the editor. Hand any agent a token. Re-implement nothing." (current has too many commas; condense) |
| protocol/page.tsx | 219 | "Scope every token to exactly what it needs." | KEEP | - |
| protocol/page.tsx | 256 | "Bearer tokens, scoped and hashed." | KEEP | - |
| protocol/page.tsx | 297 | "Three calls to a working agent integration." | REWRITE | "Three calls to plug an agent into the system." (replaces noun `integration` with active framing) |
| protocol/page.tsx | 299-302 | "Mint a token, point your agent at the MCP endpoint, then read your first system in under a minute." | KEEP | - |
| protocol/page.tsx | 351-355 | bottom h2: "Plug your agent into a real architecture." | KEEP | - |

### Marketing surface: docs `src/app/(marketing)/docs/page.tsx`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| docs/page.tsx | 7 | metadata desc: "Build, validate, and ship systems with Pipes." | KEEP | - |
| docs/page.tsx | 105-110 | h1: "Build, validate, and ship systems with Pipes." | KEEP | - |
| docs/page.tsx | 112-115 | "Concepts, guides, and reference. Everything you need to take a system from idea to production handoff." | KEEP | - |
| docs/page.tsx | 161-164 | "Pipes is a typed canvas, validation engine, and protocol layer for the architecture your team and agents share. A Pipes system is more than a diagram - it is an executable contract any agent can read." | KEEP | - |

### Marketing surface: use cases `src/app/(marketing)/use-cases/page.tsx` + detail

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| use-cases/page.tsx | 8-10 | metadata desc: "How teams use Pipes to ship multi-agent systems, automation, support ops, and architecture handoffs." | KEEP | - |
| use-cases/page.tsx | 31 | h1: "How teams ship with Pipes." | KEEP | - |
| use-cases/page.tsx | 33-36 | "Real workloads from real teams. Pick a use case to see the system shape, workflow, and templates that ship with it." | KEEP | - |
| use-cases/page.tsx | 80 | "Don't see your workload?" | KEEP | - |
| use-cases/page.tsx | 83-86 | "Pipes adapts to any system shape. Talk to our team about how to model yours." | KEEP | - |
| use-cases/[slug]/page.tsx | 117-119 | "Pipes turned our system diagrams into something our agents actually respect. We stopped re-prompting and started shipping." | KEEP | - |
| use-cases/[slug]/page.tsx | 120-122 | "Composite quote from teams running this workload" | DELETE | - (a synthetic-quote disclaimer screams unlaunched. The audience is a senior engineer who reads this as fake.) |
| use-cases/[slug]/page.tsx | 134 | SectionBadge "The problem" | KEEP | - |
| use-cases/[slug]/page.tsx | 150 | SectionBadge "The solution" | REWRITE | Replace label "The solution" with "How Pipes fits" (drops banned `solution`) |
| use-cases/[slug]/page.tsx | 270-272 | "Fork a template, validate, and hand it to your agents in under five minutes." | KEEP | - |
| use-cases/[slug]/page.tsx | 309 | bottom h2: "Make this your team's next system." | KEEP | - |

### Marketing surface: templates `src/app/(marketing)/templates/...`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| templates/page.tsx | 6-8 | metadata desc: "Production-ready system templates for multi-agent, automation, support, and architecture workflows." | KEEP | - |
| TemplatesGallery.tsx | 70-72 | badge: "Production-ready system blueprints" | KEEP | - |
| TemplatesGallery.tsx | 73 | h1: "Templates" | REWRITE | "Forkable systems your team has already shipped." (h1 is the cheapest copy slot on the page; "Templates" repeats the page title) |
| TemplatesGallery.tsx | 74-76 | "Pre-built, validated system designs you can fork into your workspace in seconds. Each template ships with typed nodes, pipes, and a reviewable graph." | KEEP | - |
| TemplatesGallery.tsx | 90 | metric footer: "Curated by the Pipes team" | KEEP | - |
| TemplatesGallery.tsx | 150 | "Need a custom template?" | KEEP | - |
| TemplatesGallery.tsx | 151-153 | "Start from a blank canvas and let the AI assistant scaffold the system for you." | KEEP | - |
| templates/[slug]/page.tsx | 73 | step "Sign up free" body: "Create your Pipes workspace in under a minute. No credit card required." | KEEP | - |
| templates/[slug]/page.tsx | 167-171 | overview body: "{useCase} - A reliable starting point for teams building {category} systems. Includes the core flow plus extension points for tools, guardrails, and integrations." | REWRITE | "{useCase}. A starting point for teams building {category} systems. Fork it, edit the nodes, ship." (cuts `extension points`, `integrations`, the noun pile) |

### Marketing surface: compare

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| compare/page.tsx | 14-16 | metadata desc: "Honest, head-to-head comparisons: Pipes vs Figma, Miro, Lucidchart, and AI-generated diagrams." | KEEP | - |
| compare/page.tsx | 32 | h1: "How Pipes stacks up" | KEEP | - |
| compare/page.tsx | 33-35 | "We respect the alternatives. Here is where Pipes wins, where competitors lead, and how to choose between them for your team." | KEEP | - |
| compare/page.tsx | 85 | "Ready to evaluate Pipes for your team?" | KEEP | - |
| compare/page.tsx | 86-88 | "Spin up a free workspace and see how it fits your architecture workflow." | KEEP | - |
| compare/[slug]/page.tsx | 256-259 | "When visual presentation, freeform canvas, or general diagramming is the primary goal and execution context is not required." | REWRITE | "When the goal is a picture, not a system your agents will read." (current is one sentence with five clauses) |
| compare/[slug]/page.tsx | 287-290 | "See it for yourself" / "Spin up a free Pipes workspace - no credit card, no time limit." | KEEP | - |

### Marketing shell: nav, footer, newsletter `src/components/MarketingShell.tsx`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| MarketingShell.tsx | 31 | footer column heading: "Solutions" | REWRITE | "Use cases" (the page itself is `/use-cases`. `Solutions` is a banned word and a sales bromide.) |
| MarketingShell.tsx | 33-37 | links inside Solutions: "All use cases", "Multi-agent", "Automation", "Architecture" | KEEP | - (after column rename) |
| MarketingShell.tsx | 141, 198 | nav CTA "Start building" | KEEP | - |
| MarketingShell.tsx | 222 | newsletter h3: "Get the changelog in your inbox" | KEEP | - |
| MarketingShell.tsx | 223-225 | "One short email a month. New features, design notes, no spam." | KEEP | - |
| MarketingShell.tsx | 267-269 | tagline: "The system memory layer for software you ship with agents." | REWRITE | "One map your team and your agents both read." (this is the marketing footer. The headline MUST appear verbatim here per voice rule.) |
| MarketingShell.tsx | 303-304 | "All systems operational" | KEEP | - |

### Marketing surface: login + signup + invites

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| login/page.tsx | 7 | metadata desc: "Sign in to your Pipes workspace." | KEEP | - |
| login/page.tsx | 30 | h1: "Welcome back" | KEEP | - |
| login/page.tsx | 31-33 | "Continue to your Pipes workspace" | KEEP | - |
| login/page.tsx | 53 | placeholder: "alex@acme.com" | KEEP | - |
| login/page.tsx | 132-134 | "Secured by Auth0 - your credentials are never stored by Pipes" | KEEP | - |
| signup/page.tsx | 81 | h1: "Create your workspace" | KEEP | - |
| signup/page.tsx | 82-84 | "Free forever. No credit card required." | KEEP | - |
| signup/page.tsx | 137 | placeholder workspace: "Acme AI" | KEEP | - |
| invites/[token]/page.tsx | 86 | "You are in!" | KEEP | - |
| invites/[token]/page.tsx | 101 | "You have already joined" | KEEP | - |
| invites/[token]/page.tsx | 117 | "This invitation is no longer valid" | KEEP | - |
| invites/[token]/page.tsx | 143 | "You have been invited" | KEEP | - |

### App surface: dashboard `src/components/dashboard/DashboardClient.tsx`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| DashboardClient.tsx | 547-551 | metric "Total systems" footer "{n} active" | KEEP | - |
| DashboardClient.tsx | 553-557 | "Active this week" / "Updated in last 7 days" | KEEP | - |
| DashboardClient.tsx | 558-563 | "Favorites" / "Pinned for quick access" | KEEP | - |
| DashboardClient.tsx | 564-569 | "Archived" / "Hidden from default view" | KEEP | - |
| DashboardClient.tsx | 593-595 | search placeholder "Search systems" | KEEP | - |
| DashboardClient.tsx | 631 | button "New System" | KEEP | - |
| DashboardClient.tsx | 661 | h2: "Start your first system" | REWRITE | "One map your team and your agents both read." (this is the dashboard empty state - the closest thing to the editor empty state per audience.md voice rule. Headline MUST appear here.) |
| DashboardClient.tsx | 662-664 | "Pipes treats every node the same. You decide what each one is." | REWRITE | "Draw the nodes, ports, and pipes once. Stop being the map." |
| DashboardClient.tsx | 668 | button "New system" | KEEP | - |
| DashboardClient.tsx | 675 | "or start from a template" | KEEP | - |
| DashboardClient.tsx | 686-689 | empty filter titles "Nothing archived" / "No favorites yet" / "No systems yet" | KEEP | - |
| DashboardClient.tsx | 695 | "Archived systems live here. They are hidden from the default view." | KEEP | - |
| DashboardClient.tsx | 697 | "Favorite systems for quick access from the toolbar." | KEEP | - |
| DashboardClient.tsx | 698 | "Start fresh, import a schema, or grab a template." | KEEP | - |
| DashboardClient.tsx | 789-791 | dialog "Import system" / "Paste a pipes_schema_v1 JSON document. A new system will be created with its contents." | KEEP | - |

### App surface: AppShellClient + NavLinks

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| AppShellClient.tsx | 256 | search placeholder: "Search systems, templates, docs..." | KEEP | - |
| AppShellClient.tsx | 263 | status badge: "All systems normal" | REWRITE | "All systems operational" (matches the footer badge and is the standard SaaS phrasing; current "normal" is unusual without precedent) |
| NavLinks.tsx | 30 | section heading: "Workspace" | KEEP | - |
| NavLinks.tsx | 32 | nav label: "Systems" | KEEP | - |
| NavLinks.tsx | 33 | nav label: "Templates" | KEEP | - |
| NavLinks.tsx | 59 | bottom section: "Operate" | KEEP | - |

### App surface: Settings shell + pages

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| SettingsShell.tsx | 36-44 | nav heading "Workspace" + items "Billing", "Collaboration", "Operations", "Trust & Security" | REWRITE | Change "Trust & Security" -> "Trust and security" (rule: ASCII only; ampersand reads like brochure copy. Already-shipped pricing copy uses "Security and support".) |
| SettingsShell.tsx | 46-52 | nav heading "Developer" + "Tokens", "Audit log" | KEEP | - |
| billing/page.tsx | 234-235 | PageHeader title "Workspace" / subtitle "Plan, billing, and workspace defaults." | KEEP | - |
| billing/page.tsx | 491-493 | dialog "Cancel subscription?" / "Your workspace will continue until the end of the current billing period, then revert to Free." | KEEP | - |
| collaboration/page.tsx | 374-375 | PageHeader title "Members & teams" / subtitle "Manage who can view, comment on, and edit this workspace." | REWRITE | Use ASCII: "Members and teams" (no ampersand, per voice rule "ASCII only" reading; ampersand is technically ASCII but inconsistent with rest of nav) |
| collaboration/page.tsx | 513 | empty state desc: "Teams let you grant access to groups instead of individuals. Coming soon." | KEEP | - |
| collaboration/page.tsx | 530-531 | dialog "Invite a member" / "Send an invite to add a new member to this workspace." | KEEP | - |
| tokens/page.tsx | 267-268 | PageHeader title "Developer" / subtitle "API tokens, audit log, and developer integrations." | REWRITE | "API tokens and integrations." (drops repeated `developer`; current line names the same thing the heading already named) |
| tokens/page.tsx | 307-308 | empty: "No tokens yet" / "Generate a token to start integrating with the Pipes Protocol API or MCP." | KEEP | - |
| tokens/page.tsx | 356-357 | dialog "Generate a token" / "Pick a descriptive name and only the capabilities you need." | KEEP | - |
| tokens/page.tsx | 458-459 | "Token created" / "Copy and store this secret now. It will not be shown again." | KEEP | - |

### App surface: Admin

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| admin/page.tsx | 285-286 | "Admin overview" / "Mission control for support, billing, and platform health." | REWRITE | "Admin overview" / "Support, billing, and workspace health." (drops banned word `platform` and the cliche `mission control`) |
| admin/page.tsx | 341 | help text: "Inspect any workspace or system by id or email." | KEEP | - |
| admin/page.tsx | 477 | "Released today by platform team. Hotfix for editor autosave queue." | REWRITE | "Released today. Hotfix for the editor autosave queue." (drops banned `platform`) |
| admin/layout.tsx | 67 | StatusBadge "Internal" | KEEP | - |

### App surface: 404 `src/app/not-found.tsx`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| not-found.tsx | 12 | h2: "Page not found" | KEEP | - |
| not-found.tsx | 13-15 | "The page you are looking for does not exist or has been moved. Check the URL or return to your workspace." | KEEP | - |

### Templates catalog `src/domain/templates/catalog.ts`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| catalog.ts | 26 | title: "Single Agent Loop" | DELETE | - (audience rejects the solo hacker. A single-agent loop template is the on-ramp for the user we explicitly do NOT serve. Cut.) |
| catalog.ts | 27 | desc: "Input to agent to output baseline loop." | DELETE | - (companion to above) |
| catalog.ts | 47 | title: "Multi-agent Research" | KEEP | - |
| catalog.ts | 48 | desc: "Planner plus researcher plus synthesizer flow." | REWRITE | "A planner agent, a retriever, and a synthesizer hand off through one contract." (current uses "plus plus plus" filler) |
| catalog.ts | 72 | title: "Automation Workflow" | KEEP | - |
| catalog.ts | 73 | desc: "Trigger to decision to action automation." | REWRITE | "Trigger fires. Decision routes. Action runs." (verbs over nouns; one idea per sentence) |
| catalog.ts | 95 | title: "Support Ops System" | KEEP | - |
| catalog.ts | 96 | desc: "Classify, guardrail, and escalate support flows." | KEEP | - |
| catalog.ts | 119 | title: "Customer Support Triage" | KEEP | - |
| catalog.ts | 120 | desc: "Classify inbound tickets, self-serve when confident, and escalate when not." | KEEP | - |
| catalog.ts | 149 | title: "Sales Lead Qualifier" | REWRITE | Consider scoping: this is a sales-team template, not a staff-engineer template. Verdict KEEP only because the Sales staff engineer building the qualifier is a fit. Suggest reframing description to focus on the engineer who builds it. |
| catalog.ts | 150 | desc: "Enrich, qualify, and tier inbound leads before writing to the CRM." | KEEP | - |
| catalog.ts | 176 | title: "Code Review Assistant" | KEEP | - |
| catalog.ts | 177 | desc: "Run linter, security, and style reviews in parallel and post a single PR comment." | KEEP | - |
| catalog.ts | 207 | title: "Document QA System" | KEEP | - |
| catalog.ts | 208 | desc: "Answer user questions over a corpus with retrieved context and inline citations." | KEEP | - |
| catalog.ts | 234 | title: "Content Moderation Pipeline" | KEEP | - |
| catalog.ts | 235 | desc: "Classify user submissions, route by severity, and log every decision for audit." | KEEP | - |
| catalog.ts | 264 | title: "Scheduling Assistant" | KEEP | - |
| catalog.ts | 265 | desc: "Resolve calendar conflicts and propose a time the requester can confirm." | KEEP | - |
| catalog.ts | 288 | title: "Data Extraction Pipeline" | KEEP | - |
| catalog.ts | 289 | desc: "Turn uploaded documents into validated structured records, with a dead-letter for failures." | KEEP | - |
| catalog.ts | 315 | title: "Research Deep Dive" | KEEP | - |
| catalog.ts | 316 | desc: "Plan a multi-source investigation, synthesize findings, and fact-check the result." | KEEP | - |
| catalog.ts | 347 | title: "Onboarding Orchestrator" | REWRITE | "New Hire Runbook" (banned-word adjacent: `Orchestrator` is the noun form of `orchestration`, which the voice rules call out as a noun-pile word. Use `Runbook` to match the engineering-team metaphor.) |
| catalog.ts | 348 | desc: "Run the full new-hire checklist from provisioning through manager handoff." | KEEP | - |
| catalog.ts | 374 | title: "Incident Response Runbook" | KEEP | - |
| catalog.ts | 375 | desc: "Page on-call, run the right runbook, drive the response, and draft the post-mortem." | KEEP | - |

### Public content `src/lib/public/content.ts`

| File | Line(s) | Current copy | Verdict | Proposed replacement |
|------|---------|--------------|---------|----------------------|
| content.ts | 5 | hero title: "Design systems your team and agents can both execute" | REWRITE | "One map your team and your agents both read." (locked headline) |
| content.ts | 6 | subtitle: "Pipes captures architecture as reusable, validated, machine-readable system memory." | REWRITE | "Draw the nodes, ports, and pipes once. Your team reviews it. Your agents read it." (verbs, one idea per sentence) |
| content.ts | 10-15 | proof titles "Systems, not diagrams" / "Validation + simulation" / "Protocol-ready" / "Human + agent collaboration" | KEEP | - |
| content.ts | 21 | use case "Multi-agent systems" / problem: "Coordinating planners, specialists, and reviewers across one reliable contract is hard." | KEEP | - |
| content.ts | 21 | fit: "Pipes models multi-agent orchestration with typed interfaces and explicit dependencies." | REWRITE | "Pipes hands off planners, specialists, and reviewers through one typed contract." (drops the noun `orchestration`) |
| content.ts | 22 | "automation triggers, decisions, and actions in one reusable system model" | KEEP | - |
| content.ts | 23 | fit: "Pipes captures triage, policy checks, and human approval points explicitly." | KEEP | - |
| content.ts | 24 | "technical-system-design" fit: "Pipes keeps architecture and operational interface truth in one structured source." | REWRITE | "One map your team reads. Your agents read it too." (current is jargon soup with `operational interface truth`) |
| content.ts | 25 | "agency-handoff" fit: "Pipes provides a transferable system artifact with versions, notes, and protocol endpoints." | KEEP | - |
| content.ts | 29 | figma summary: "Figma excels at interface design. Pipes is built for executable system architecture." | KEEP | - |
| content.ts | 29 | figma differences[0]: "Pipes uses typed system graph semantics" | REWRITE | "Pipes types every node, port, and pipe." (drops the academic noun `semantics`) |
| content.ts | 29 | figma bestFor: "When architecture needs to be reusable operational memory, not only visual communication." | KEEP | - |
| content.ts | 30 | miro summary: "Miro is excellent for broad collaborative canvases. Pipes focuses on structured system specification." | KEEP | - |
| content.ts | 30 | miro differences[2]: "Agent and protocol-ready outputs" | KEEP | - |
| content.ts | 31 | lucidchart summary: "Lucidchart is strong for diagramming standards. Pipes prioritizes reusable architecture execution context." | REWRITE | "Lucidchart draws diagrams. Pipes draws systems your agents can read." (drops the noun pile `architecture execution context`) |
| content.ts | 32 | ai-generated summary: "AI-generated diagrams are fast drafts; Pipes is ongoing system memory with governance." | KEEP | - |

## Headline placement

The locked headline is "One map your team and your agents both read."

Required appearances per `docs/audience.md` voice rule:

| Required location | Currently appears? | File:line |
|------------------|---------------------|-----------|
| Homepage hero | NO | `src/app/(marketing)/page.tsx:159-165` currently shows "System memory for software you ship with agents." -- TODO |
| Editor empty state | NO | The closest editor empty state is the dashboard empty state in `src/components/dashboard/DashboardClient.tsx:661` which says "Start your first system." -- TODO |
| Marketing footer | NO | `src/components/MarketingShell.tsx:267-269` says "The system memory layer for software you ship with agents." -- TODO |

The headline does not appear anywhere in source. Three TODO placements above.

Verbatim near-matches today (off-brief, not the locked headline):

- `src/app/(marketing)/page.tsx:167-169`: "One typed source of truth your team and your agents both read." -- close, but rewrites the headline.
- `src/lib/public/content.ts:5`: hero title "Design systems your team and agents can both execute" -- different verbs.

## Word blacklist hits

Banned words from `docs/audience.md`: platform, solution, leverage, empower, seamless, unlock, robust, holistic. Also CLAUDE-style add-ons: cutting-edge, world-class, best-in-class.

| File | Line | Banned word | Context |
|------|------|-------------|---------|
| `src/components/MarketingShell.tsx` | 31 | solution(s) | footer column heading "Solutions" |
| `src/app/(marketing)/use-cases/[slug]/page.tsx` | 150 | solution | SectionBadge label "The solution" |
| `src/app/(marketing)/pricing/page.tsx` | 91 | solution | enterprise feature "Dedicated solutions engineer" |
| `src/app/(app)/admin/page.tsx` | 286 | platform | subtitle "Mission control for support, billing, and platform health." |
| `src/app/(app)/admin/page.tsx` | 477 | platform | "Released today by platform team." |
| `src/app/(app)/admin/release/page.tsx` | 125, 133, 141, 277 | platform | author labels in release log |

Worst offender: `MarketingShell.tsx:31` -- the word "Solutions" appears as a top-level footer column on every marketing page on the site.

Also worth flagging the comment in `src/app/(marketing)/use-cases/[slug]/page.tsx:148` (`{/* Solution */}`) -- not customer-facing, but the pattern shows up four times and signals the team thinks in those terms.

## Summary

Stats:
- Total strings flagged: 56
- KEEP (not flagged): the bulk of the corpus passes (estimated 200+ strings reviewed; only 56 flagged here means roughly 75 percent on-brief)
- REWRITE: 51
- DELETE: 5

Top three surfaces by rewrite count:
1. `src/app/(marketing)/page.tsx` (homepage) -- 7 rewrites including the hero h1, hero subhead, and a step body
2. `src/lib/public/content.ts` (homepage data + use-case fits + comparisons) -- 7 rewrites including the hero title and subtitle that the homepage reads
3. `src/components/MarketingShell.tsx` + `src/components/AppShellClient.tsx` -- 4 rewrites including the marketing footer tagline and a banned-word column heading

Tone drift observed: the copy reads like an enterprise architecture vendor at parts (`platform health`, `solutions engineer`, `operational interface truth`, `multi-agent orchestration`) and like a generic SaaS site at others (`Solutions`, `world-class`-adjacent phrasing, `system memory layer for software you ship with agents`). The locked headline "One map your team and your agents both read" is missing from all three required placements, and the homepage hero leads with "System memory" -- a noun that the voice rules tell us to replace with verbs. The catalog still ships a `Single Agent Loop` template aimed squarely at the solo hacker the audience explicitly rejects. Phase 4 should fix the headline placements first, then run the rewrites, then cut `single-agent-loop` from the catalog.
