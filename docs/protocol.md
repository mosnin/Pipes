# Pipes protocol

Pipes has two ways in for code and agents, both behind the same tokens,
permissions and audit log:

- **MCP** at `/api/mcp`: how agents list workflows and run them step by step.
  OAuth clients only need the URL. See [mcp.md](mcp.md).
- **REST** under `/api/protocol/*`: reading and editing workflows from code.
  This page covers it.

Business rules (permissions, validation, entitlements, version safety) live in
`src/domain/services/bounded.ts`; both transports go through them. API and MCP
access start on the Pro plan.

## Tokens
1. Create a token in Settings, API tokens (or `POST /api/settings/tokens`).
2. Copy the secret; it is shown once and stored as a hash.
3. Send `Authorization: Bearer ptk_...`.
4. Capabilities and the optional `systemScope` are checked before anything runs.

OAuth clients connected to `/api/mcp` receive the same kind of token, named
after the client, and it can be revoked in the same place.

## Error model
See `docs/errors.md`.
All protocol routes return structured error payloads with `code`, `message`, and `requestId`.

## Idempotency
Supported REST write routes accept `Idempotency-Key`:
- `POST /api/protocol/systems`
- `POST /api/protocol/templates/:templateId/instantiate`
- `POST /api/protocol/import/system`
- `POST /api/protocol/systems/:systemId/versions`
- `POST /api/protocol/comments`

If the same key is replayed with the same body, previous success is returned with `replayed: true`.
If replayed with a different body, response is `CONFLICT`.

## Rate limits
Fixed one-minute windows per token:
- REST reads: 120 a minute
- REST writes: 60 a minute
- MCP (`/api/mcp`): 240 requests a minute

Exceeded REST requests return `RATE_LIMITED` (HTTP 429).

## Usage
Every token-authenticated REST request counts as one API call toward the
workspace's monthly allowance (`src/domain/usage/service.ts`).

## REST routes
Paths use `systems`, the older name for workflows; `systemId` is a workflow id.

Read:
- `GET /api/protocol/systems`
- `GET /api/protocol/systems/:systemId`
- `GET /api/protocol/systems/:systemId/schema`
- `GET /api/protocol/systems/:systemId/versions`
- `GET /api/protocol/systems/:systemId/validation`
- `GET /api/protocol/templates`

Write:
- `POST /api/protocol/systems`
- `POST /api/protocol/templates/:templateId/instantiate`
- `POST /api/protocol/import/system`
- `POST /api/protocol/systems/:systemId/versions`
- `POST /api/protocol/graph` (non-idempotent)
- `POST /api/protocol/comments`

## MCP
See [mcp.md](mcp.md) for the server, OAuth and the run loop.

The older `POST /api/protocol/mcp` endpoint (`{ "tool": "...", "input": {} }`)
still works for existing integrations, but it is not an MCP server and does
not expose runs. New integrations should use `/api/mcp`.

## Observability
- Audit entries include actor, action, target, outcome, timestamp.
- Protocol writes include request correlation ID + transport metadata (`rest`/`mcp`).
- Audit API supports filtering by actor, actorId, action prefix, workflow, transport, outcome, and time window, plus CSV export.

## Machine-readable API
OpenAPI spec: `docs/openapi/protocol.json`.

## SDK examples
- TypeScript starter: `examples/protocol/client.ts`
- Python starter: `examples/protocol/client.py`

## End-to-end examples
Create token and call API:
```bash
curl -X POST http://localhost:3000/api/settings/tokens \
  -H 'content-type: application/json' \
  --cookie 'pipes_session=...' \
  -d '{"name":"CI","capabilities":["systems:read","systems:write","schema:read"]}'

curl http://localhost:3000/api/protocol/systems \
  -H 'authorization: Bearer ptk_...'
```

Create a workflow from a schema:
```bash
curl -X POST http://localhost:3000/api/protocol/import/system \
  -H 'authorization: Bearer ptk_...' \
  -H 'Idempotency-Key: import-001' \
  -H 'content-type: application/json' \
  -d '{"canonical":"{...pipes_schema_v1...}"}'
```

Export a workflow:
```bash
curl http://localhost:3000/api/protocol/systems/sys_123/schema \
  -H 'authorization: Bearer ptk_...'
```

Instantiate a template:
```bash
curl -X POST http://localhost:3000/api/protocol/templates/single-agent-loop/instantiate \
  -H 'authorization: Bearer ptk_...' \
  -H 'Idempotency-Key: tpl-001' \
  -H 'content-type: application/json' \
  -d '{"name":"Support Template"}'
```

Create a version:
```bash
curl -X POST http://localhost:3000/api/protocol/systems/sys_123/versions \
  -H 'authorization: Bearer ptk_...' \
  -H 'Idempotency-Key: ver-001' \
  -H 'content-type: application/json' \
  -d '{"name":"pre-release"}'
```

Handle protocol error:
```bash
curl -X POST http://localhost:3000/api/protocol/systems \
  -H 'authorization: Bearer bad_token' \
  -H 'content-type: application/json' \
  -d '{"name":"x"}'
# => {"ok":false,"error":{"code":"AUTH_INVALID", ...}}
```
