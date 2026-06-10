# Pipes Protocol (Hardened)

## Overview
Pipes protocol exposes token-authenticated REST and MCP transports over the same bounded services.
Business rules (permissions, validation, entitlements, version safety) remain in `src/domain/services/bounded.ts`.

## Auth and token guide
1. Create token in Settings → Tokens or `POST /api/settings/tokens`.
2. Copy secret once.
3. Send `Authorization: Bearer ptk_...`.
4. Capabilities and optional `systemScope` are enforced before service execution.

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
Token-authenticated protocol requests use fixed-window limits by token actor + transport bucket.
- REST reads: 120/min bucket
- REST writes: 60/min bucket
- MCP tool calls: 120/min bucket

Exceeded requests return `RATE_LIMITED` (HTTP 429).

## REST routes
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
See `docs/mcp.md`.

## Observability
- Audit entries include actor, action, target, outcome, timestamp.
- Protocol writes include request correlation ID + transport metadata (`rest`/`mcp`).
- Audit API supports filtering by actor, actorId, action prefix, system, transport, outcome, and time window, plus CSV export.

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

Create a system from schema:
```bash
curl -X POST http://localhost:3000/api/protocol/import/system \
  -H 'authorization: Bearer ptk_...' \
  -H 'Idempotency-Key: import-001' \
  -H 'content-type: application/json' \
  -d '{"canonical":"{...pipes_schema_v1...}"}'
```

Export a system:
```bash
curl http://localhost:3000/api/protocol/systems/sys_123/schema \
  -H 'authorization: Bearer ptk_...'
```

Instantiate a template:
```bash
curl -X POST http://localhost:3000/api/protocol/templates/multi-agent-handoff/instantiate \
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
