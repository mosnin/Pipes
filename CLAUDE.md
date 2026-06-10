# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Personas

**Engineering (code, architecture, systems, performance, reliability):** Think and act as **Elon Musk**. Relentlessly question every abstraction. Delete before adding. If a module isn't earning its existence, remove it. Performance is a feature. Every extra layer of indirection is debt. Ask "do we actually need this?" before writing a single line.

**Product, features, UI, UX, design:** Think and act as **Steve Jobs**. Every screen has one job. The magic moment must be obvious and immediate. If a user needs to read instructions, the design failed. Cut features until what remains is undeniable. Taste matters.

---

## Commands

```bash
npm run dev          # Start Next.js dev server (mock mode by default)
npm run build        # Production build
npm run typecheck    # tsc --noEmit (run this before committing)
npm run lint         # ESLint across src/, tests/, convex/, root config files
npm test             # Vitest unit tests (tests/unit/)
npm run test:e2e     # Playwright E2E tests (tests/e2e/)
```

Run a single unit test file:
```bash
npx vitest run tests/unit/validation.test.ts
```

Mock mode (no external services needed):
```bash
cp .env.example .env.local   # set PIPES_USE_MOCKS=true
npm run dev
```

---

## Architecture

### Runtime modes

The app operates in two modes controlled by `PIPES_USE_MOCKS`:

- **Mock mode** (`PIPES_USE_MOCKS=true`): All repositories are in-memory stubs (`src/lib/repositories/mock.ts`). No Convex, no Clerk, no external APIs needed. All dev work happens here by default.
- **Provider mode**: Real Convex database, Clerk auth, OpenAI, Creem billing, Resend email. Requires all env vars set in `.env.local`.

The switch happens in `src/lib/composition/server.ts` via `getServerApp()` — the single entry point for all server-side request handling. It provisions an `AppContext` (userId, workspaceId, role, plan) and returns typed `services` and `repositories`.

### The request path

```
API route → getServerApp() → repositories (mock or Convex) → AppContext
                           → createBoundedServices(repositories) → services.*
```

All business logic lives in `src/domain/services/bounded.ts` as typed service classes (`SystemService`, `GraphService`, `SchemaService`, etc.). Routes are thin — they call one service method and return a response. Services enforce permissions via `AccessService` and entitlements via `EntitlementService`.

### Repository pattern

`src/lib/repositories/contracts.ts` defines the interfaces (`SystemsRepository`, `GraphRepository`, etc.) and the `RepositorySet` type. Two implementations:
- `src/lib/repositories/mock.ts` — in-memory, used for dev and all unit tests
- `src/lib/repositories/convex.ts` — wraps the Convex HTTP client

When adding persistence for a new feature, define the interface in contracts first, implement in both mock and Convex, then inject through `RepositorySet`.

### The canonical schema

`src/domain/pipes_schema_v1/schema.ts` is the source of truth for all types. 27 node types are defined in `nodeTypeValues`. The canonical export format is `pipes_schema_v1` JSON validated by Zod. Schema migration lives in `src/domain/pipes_schema_v1/migration.ts` — add new version migrations to the `migrations` map there.

### The MCP/Protocol layer

`src/app/api/protocol/mcp/route.ts` is the single MCP endpoint. All tools dispatch here. Authentication is Bearer token via `src/lib/protocol/auth.ts` (`getProtocolContext`). Tokens are SHA-256 hashed before storage (`ptk_` prefix, stored hash in `agent_tokens` table). Capability checking uses `requireCapability(ctx, "graph:write", systemId)`.

Available capabilities: `systems:read`, `systems:write`, `schema:read`, `templates:read`, `templates:instantiate`, `versions:read`, `versions:write`, `graph:write`, `comments:write`, `import:write`, `validation:read`.

### Editor architecture

`src/components/editor/EditorWorkspace.tsx` is the main editor. It has two modes controlled by `clientRuntimeFlags`:
- `RealEditorWorkspace` — uses `useQuery(api.app.getSystemBundle)` for Convex real-time subscriptions
- `MockEditorWorkspace` — polls `/api/graph` every 1.5s

Both feed into `EditorWorkspaceView`. Mutations go through an optimistic local queue: `localApply()` updates state immediately, then actions are flushed to `/api/graph` via the queue mechanism. Undo/redo is handled by `pushHistory` / `popUndo` / `popRedo` from `editor_state.ts`.

### Convex

`convex/app.ts` contains all Convex mutations and queries. `convex/schema.ts` defines all tables. The generated client types live in `convex/_generated/`. When modifying a mutation, update both the Convex handler and the corresponding mock in `src/lib/repositories/mock.ts`.

### UI component rules

- **HeroUI v3** uses compound component syntax: `Card.Content`, `Table.Header`, `Table.Body`, `Dropdown.Popover`, `Tabs.List`, `Tabs.Tab`, `Avatar.Fallback`. There is no `HeroUIProvider` wrapper and no `heroui()` Tailwind plugin.
- Custom primitives (`Button`, `Badge`, `Panel`, `AvatarStack`, `Input`, etc.) live in `src/components/ui/`.
- Toast notifications use `sonner`: `toast.success()`, `toast.error()`, `toast.loading()` with an `id` for updates.
- Do not use Unicode curly quotes (`"`, `"`, `'`, `'`) in JSX string literals — TypeScript will reject them. Use ASCII only.

### Subsystem blueprints

`src/domain/subsystem_blueprint/service.ts` exports, lists, and instantiates subsystem blueprints. Blueprints are stored as `plan_memory` memory entries with the `subsystem_blueprint` tag. The blueprint's `id` is stored as the entry's `title` — that's the lookup key in `instantiate()`.

### Node config schemas

`src/domain/node_config/schema.ts` defines per-node-type typed field definitions (`ConfigFieldDef[]`). The editor's Inspector renders these as typed form fields. When adding a new node type to `nodeTypeValues`, also add its config schema here.

---

## Key env vars

| Var | Purpose |
|-----|---------|
| `PIPES_USE_MOCKS` | `true` = in-memory mock mode (default) |
| `NEXT_PUBLIC_PIPES_USE_MOCKS` | Client-side mirror of above |
| `CONVEX_URL` + `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `OPENAI_API_KEY` + `OPENAI_MODEL` | AI features (default `gpt-4.1-mini`) |
| `CREEM_API_KEY` + `CREEM_WEBHOOK_SECRET` | Billing |
| `RESEND_API_KEY` | Email (invites) |
| `PIPES_ADMIN_ALLOWLIST` | Comma-separated emails for admin access |
