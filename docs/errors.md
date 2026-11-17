# Protocol error model

Payload shape:
```json
{
  "ok": false,
  "error": {
    "code": "AUTH_INVALID",
    "message": "Invalid token.",
    "requestId": "uuid",
    "details": {}
  }
}
```

Error codes:
- `AUTH_REQUIRED` (401)
- `AUTH_INVALID` (401)
- `PERMISSION_DENIED` (403)
- `SCOPE_VIOLATION` (403)
- `VALIDATION_ERROR` (400)
- `PLAN_LIMIT` (402)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

## Run and rails codes

Run endpoints (`/api/runs/*`, `/api/systems/{id}/runs`) and MCP run tools use
the codes in [rails.md](rails.md#error-codes) and [agent_contract.md](agent_contract.md),
returned as `{ ok: false, error: <code>, message }` over REST.
