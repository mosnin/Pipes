# Looper — Success Audit v1

> Definition of done for each phase. Run this checklist after each phase to confirm completion before proceeding.

---

## How to Use This File

After completing each phase, go through its checklist. Every item must be ✅ before moving to the next phase. Items marked 🔴 are blockers — do not advance if any 🔴 is unresolved.

---

## Phase 1 Audit: Core Rebrand

### 1.1 Package Metadata 🔴
- [ ] `package.json` `name` field is `"looper"` (not `"pipes"`)
- [ ] `packages/cli/package.json` `name` field is `"@looper/cli"` (not `"@pipes/cli"`)
- [ ] `packages/cli/package.json` binary key is `"looper"` (not `"pipes"`)
- [ ] `packages/cli/package.json` bundle output names contain `looper-*` not `pipes-*`

### 1.2 CLI Binary & Command 🔴
- [ ] `new Command("looper")` in `packages/cli/src/index.ts`
- [ ] No `new Command("pipes")` exists anywhere
- [ ] Help text says "looper" not "pipes" (run `node dist/index.js --help` or check source)
- [ ] Shell completion functions renamed: `_looper_completion`, `compdef _looper`, `complete -c looper`

### 1.3 Domain & URL Strings 🔴
- [ ] `packages/cli/src/config.ts` DEFAULT_API points to `looper.dev`
- [ ] `packages/cli/src/commands/init.ts` DEFAULT_API points to `looper.dev`
- [ ] `src/lib/seo/canonical.ts` APP_BASE_URL is `https://looper.dev`
- [ ] Grep for `pipes.dev` in `src/` returns 0 results
- [ ] Grep for `pipes.sh` in `packages/cli/` returns 0 results

### 1.4 SEO & Metadata 🔴
- [ ] `src/app/layout.tsx` title is `"Looper"`
- [ ] Grep for `"- Pipes"` in `src/app/(marketing)/` returns 0 results
- [ ] `src/lib/seo/jsonld.ts` Organization name is `"Looper"` (all 3 instances)
- [ ] `src/lib/seo/jsonld.ts` SoftwareApplication name is `"Looper"`

### 1.5 Visual Brand 🔴
- [ ] `src/components/Wordmark.tsx` renders "Looper" text, not "Pipes"
- [ ] Dev server shows "Looper" wordmark in sidebar and navbar

### 1.6 Environment Variables 🔴
- [ ] `.env.example` contains `LOOPER_USE_MOCKS`, `NEXT_PUBLIC_LOOPER_USE_MOCKS`
- [ ] No `PIPES_*` env vars exist in `.env.example`
- [ ] `src/lib/env/index.ts` reads `LOOPER_*` vars not `PIPES_*`
- [ ] `src/lib/env/client.ts` reads `NEXT_PUBLIC_LOOPER_USE_MOCKS`
- [ ] `packages/cli/src/config.ts` reads `LOOPER_API`, `LOOPER_TOKEN`, `LOOPER_MEMORY_SYSTEM`
- [ ] Grep for `PIPES_` in `src/` and `packages/cli/src/` returns 0 results

### 1.7 Config Files & Storage 🔴
- [ ] Config file reference is `.looper.yml` everywhere (not `.pipes.yml`)
- [ ] `packages/cli/src/memory/vector-store.ts` uses `~/.looper` directory
- [ ] `src/lib/onboarding/storage.ts` key is `looper-onboarding-state`
- [ ] `src/lib/sound/useSoundPreference.ts` key is `looper-sound-on`

### 1.8 Type & Class Names
- [ ] `PipesClient` → `LooperClient` (in `packages/cli/src/client.ts`)
- [ ] `PipesConfig` → `LooperConfig` (in `packages/cli/src/config.ts`)
- [ ] `PipesSchemaV1` → `LooperSchemaV1`
- [ ] `PipesSchemaDocument` → `LooperSchemaDocument`
- [ ] `parsePipesSchema` → `parseLooperSchema`
- [ ] `serializePipesSchema` → `serializeLooperSchema`
- [ ] `PIPES_SCHEMA_VERSION` → `LOOPER_SCHEMA_VERSION`
- [ ] `pipesService` → `looperService`
- [ ] Grep for `PipesSchema` returns 0 results
- [ ] Grep for `PipesClient` returns 0 results

### 1.9 Schema Directory
- [ ] Directory `src/domain/looper_schema_v1/` exists
- [ ] Directory `src/domain/pipes_schema_v1/` does not exist (or is empty)
- [ ] All imports updated from `pipes_schema_v1` to `looper_schema_v1`

### 1.10 Docs & README
- [ ] `README.md` title line 1 is `# Looper`
- [ ] `README.md` contains no "Pipes" brand references
- [ ] `CLAUDE.md` schema references updated to `looper_schema_v1`
- [ ] `packages/cli/INSTALL.md` shows `looper` commands, not `pipes`

### 1.11 Email Addresses
- [ ] All `@pipes.dev` email addresses updated to `@looper.dev` in copy

### 1.12 Public Fixtures
- [ ] `public/sample_system_export.json` version is `"looper_schema_v1"`

### 1.x Final Grep Verification 🔴
- [ ] `grep -r "\"Pipes\"" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"` returns 0 results (other than semantic/internal)
- [ ] `grep -r "pipes\.dev\|pipes\.sh\|app\.pipes" src/ packages/cli/src/` returns 0 results
- [ ] `grep -ri "PIPES_" src/ packages/cli/src/ .env.example` returns 0 results
- [ ] `grep -r "@pipes/" packages/cli/` returns 0 results
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 (no new errors)
- [ ] `npm run build` exits 0

---

## Phase 2 Audit: Domain Model Evolution

### 2.1 UI Terminology
- [ ] Canvas toolbar shows "Add Step" not "Add Node"
- [ ] Inspector header says "Step" not "Node"
- [ ] No user-visible "node" label in canvas (internal code can keep `node` as variable name)
- [ ] Connections are labeled "Inputs / Outputs" not "Ports" in inspector

### 2.2 New Node Types
- [ ] `LoopControl` node type exists in `nodeTypeValues` in schema
- [ ] `Checkpoint` node type exists
- [ ] `Evaluator` node type exists
- [ ] `HumanReview` node type exists (alongside existing `HumanApproval`)
- [ ] `SubLoop` replaces `Subsystem` in node type list
- [ ] New types have config schemas in `src/domain/node_config/schema.ts`

### 2.3 Schema File
- [ ] `src/domain/looper_schema_v1/schema.ts` exports `LOOPER_SCHEMA_VERSION`
- [ ] Migration `looper_schema_v1/migration.ts` has entry: `pipes_schema_v1` → `looper_schema_v1`
- [ ] `public/sample_system_export.json` parses successfully with new schema

### 2.4 Convex Schema
- [ ] `loop_runs` table exists in `convex/schema.ts` (schema only, no runtime)
- [ ] `loop_runs` fields: `loopId`, `runId`, `status`, `currentStepId`, `iteration`, `stateJson`, `startedAt`, `completedAt`

### 2.x Validation
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` passes (all tests that passed in Phase 1 still pass)

---

## Phase 3 Audit: Marketing Site

### 3.1 Homepage 🔴
- [ ] Hero headline references "loops" not "systems"
- [ ] Sub-headline mentions co-authoring with agent
- [ ] Feature sections: Loop canvas, MCP export, Co-authoring, Marketplace
- [ ] Trust strip lists: LangGraph, AutoGen, CrewAI, OpenAI SDK, Claude
- [ ] No "system design" language anywhere on homepage

### 3.2 Use Cases
- [ ] At least 4 loop-first use cases exist (Research, Support, Code Review, Sales)
- [ ] Old system-design use cases removed or reframed

### 3.3 Pricing Page
- [ ] Free tier shows loop limits (3 public loops, 10 AI turns)
- [ ] Pro tier at $29/mo with private loops, more AI turns, MCP tokens
- [ ] Team tier at $99/mo with seats
- [ ] Pricing page does not mention "system" or "node" in user-facing copy

### 3.4 Protocol → Loop API Page
- [ ] Page title/heading is "Loop API" or "Looper API"
- [ ] Code samples use `looper.dev` domain
- [ ] `LOOPER_TOKEN` in all code examples

### 3.5 Docs
- [ ] "Loop concepts" section exists
- [ ] All code samples use `looper` CLI command

### 3.x Build
- [ ] `npm run build` exits 0
- [ ] All marketing pages render without errors in dev mode

---

## Phase 4 Audit: Canvas UX

### 4.1 Visual Language 🔴
- [ ] Toolbar primary button is "Add Step"
- [ ] Step type picker shows categories: Agents, Tools, Control, I/O, Memory
- [ ] Loop-back connections (output → earlier step) render with curved arrow
- [ ] No "pipe" visual metaphor visible to users (lines/arrows are "connections")

### 4.2 LoopControl Step
- [ ] LoopControl step renders with distinct visual style (loop boundary)
- [ ] Max-iterations field visible in inspector
- [ ] Termination condition field in inspector

### 4.3 Evaluator Step
- [ ] Evaluator step renders with score/judge icon
- [ ] Inspector shows scoring rubric field

### 4.4 Inspector Updates
- [ ] Inspector header: step type + step name
- [ ] "Inputs / Outputs" label (not "Ports")
- [ ] "Loop behavior" section for LoopControl steps

### 4.x Regression
- [ ] Existing undo/redo works
- [ ] Existing optimistic queue works
- [ ] Agent builder still proposes and applies changes

---

## Phase 5 Audit: Co-authoring Layer

### 5.1 Canvas Edit Awareness 🔴
- [ ] Moving a step triggers `canvas_edit` event in agent context
- [ ] Renaming a step triggers event
- [ ] Adding/removing a connection triggers event
- [ ] Agent acknowledges edit in next chat response

### 5.2 Ghost Node UI
- [ ] Agent-proposed steps render as ghost (dashed border, muted color)
- [ ] Approve button on ghost → step becomes solid
- [ ] Reject button → ghost fades out
- [ ] Ghost connections also render as dashed

### 5.3 Chat Panel
- [ ] Chat panel always visible (not hidden)
- [ ] "Design" vs "Explain" mode switcher
- [ ] Agent references steps by name in chat
- [ ] Human can reference steps by name

### 5.4 Turn History
- [ ] Turn timeline visible in sidebar
- [ ] Cmd-Z reverts entire turn
- [ ] Before/after comparison accessible per turn

### 5.x QA
- [ ] Complete co-authoring flow: describe loop → agent draws → human moves step → agent responds to edit → approve proposal → Cmd-Z reverts
- [ ] No optimistic queue race conditions

---

## Phase 6 Audit: Marketplace Foundation

### 6.1 Public Listings 🔴
- [ ] Loop has "Make public" toggle
- [ ] Public loops appear at `/marketplace`
- [ ] Marketplace grid shows: title, description, category, install count
- [ ] Filter by category works
- [ ] Search by keyword works

### 6.2 Install Flow 🔴
- [ ] "Use this loop" copies loop into user workspace
- [ ] Installed loop is fully editable
- [ ] Attribution line shows in inspector

### 6.3 Creator Profiles
- [ ] `/creator/[username]` page renders
- [ ] Shows all public loops by creator
- [ ] Install count visible per loop

### 6.4 Paid Listings (Phase 6b)
- [ ] Creator can set a price on a loop
- [ ] Gated preview shows structure but not full copy
- [ ] Stripe Connect flow initiates on "Sell this loop"
- [ ] Looper commission (20%) calculated correctly on purchase

### 6.x QA
- [ ] Cold start: at least 20 curated loops are seeded at launch
- [ ] Marketplace loads under 2s
- [ ] No cross-workspace data leakage (buying copies, not links)

---

## Phase 7 Audit: Revenue & Access Control

### 7.1 Plan Gating 🔴
- [ ] Free users cannot create more than 3 public loops (soft wall at 3, hard wall at 4)
- [ ] Free users cannot create private loops (wall with upgrade CTA)
- [ ] Free users see "10 AI turns remaining" counter
- [ ] Pro users have unlimited private loops
- [ ] Team users see seat management in settings

### 7.2 Upgrade Flows
- [ ] Soft wall shows upgrade CTA when within 20% of limit
- [ ] Hard wall blocks action + shows upgrade CTA
- [ ] Checkout via Creem works for Pro and Team plans
- [ ] Upgrade reflected immediately in session (no logout needed)

### 7.3 Creator Revenue
- [ ] Stripe Connect setup flow accessible from creator settings
- [ ] Earnings dashboard shows: total earned, per-loop, pending payout
- [ ] Payout threshold at $25 enforced

### 7.x QA
- [ ] Free → Pro upgrade flow end-to-end
- [ ] Pro → Team upgrade flow
- [ ] Downgrade: private loops become read-only (not deleted)
- [ ] Creator payout: test transaction flows through correctly

---

## Phase 8 Audit: CLI & SDK

### 8.1 CLI 🔴
- [ ] `looper --help` works (binary renamed)
- [ ] `looper systems list` works
- [ ] `looper memory add "test"` works
- [ ] `looper mcp-server` starts
- [ ] `looper completion --shell zsh` outputs valid zsh script with `_looper_completion`
- [ ] `looper completion --shell bash` works
- [ ] `looper completion --shell fish` works

### 8.2 Install Docs
- [ ] `packages/cli/INSTALL.md` shows `curl looper.dev/install | sh`
- [ ] npm install command is `npm install -g @looper/cli`

### 8.3 SDK Stub
- [ ] `packages/sdk/` directory exists
- [ ] `packages/sdk/package.json` name is `@looper/sdk`
- [ ] `packages/sdk/src/index.ts` exports `Looper` class with `run(loopId, initialState)` stub

### 8.x Typecheck
- [ ] `cd packages/cli && npm run typecheck` exits 0
- [ ] `cd packages/sdk && npm run typecheck` exits 0

---

## Phase 9 Audit: Validation & Launch Prep

### Final Validation Gates 🔴 (all must pass)
- [ ] `npm run typecheck` exits 0 (root)
- [ ] `cd packages/cli && npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 (0 errors, warnings only)
- [ ] `npm run build` exits 0
- [ ] `npm test` — all 4 previously failing tests now fixed and passing
- [ ] `grep -ri "pipes" src/ packages/cli/src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|// \|system_pipes\|addPipe\|deletePipe"` returns 0 results

### Visual Spot-Check 🔴
- [ ] `/` — hero shows Looper branding, loop-first copy
- [ ] `/dashboard` — no "Pipes" anywhere, "Create Loop" is primary CTA
- [ ] `/marketplace` — loops grid renders, at least 10 seeded loops
- [ ] `/pricing` — Free/Pro/Team tiers with loop-first feature list
- [ ] `/docs` — "looper" CLI command in all code samples
- [ ] `/login` and `/signup` — Looper branding
- [ ] `/settings/billing` — Looper plan name, Looper pricing
- [ ] `/admin` — no "Pipes" in admin interface

### PR & Deploy
- [ ] Branch `claude/intelligent-goldberg-vtoqyn` pushed
- [ ] PR created to `main` (draft)
- [ ] Vercel preview deploys green
- [ ] PR description updated to reflect Looper transformation

---

## Overall Completion Criteria

The Looper transformation is **complete** when:

1. **Zero brand residue**: No user-visible "Pipes" anywhere — titles, copy, CLI help text, error messages, email addresses, schema exports
2. **Loop-first language**: Every user-facing term is loop vocabulary (Step, Loop, Stage, Connection, Evaluator)
3. **Canvas works**: Full loop can be built, edited, undone, and exported via MCP
4. **Marketplace live**: At least 10 public loops browseable and installable
5. **Revenue gated**: Free tier limits enforced, Pro checkout functional
6. **CLI renamed**: `looper` command works end-to-end
7. **CI green**: All automated checks pass
8. **No regressions**: Everything that worked in Pipes still works in Looper

---

*Generated: June 2026 | Version: 1.0*
