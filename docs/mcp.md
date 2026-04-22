# MCP transport guide

Endpoint: `POST /api/protocol/mcp`

Body:
```json
{ "tool": "list_systems", "input": {} }
```

Supported tools:
- `list_systems`
- `get_system`
- `export_system_schema`
- `list_templates`
- `instantiate_template`
- `create_system_from_schema`
- `create_version`
- `apply_graph_actions`
- `add_comment`
- `get_validation_report`

Errors use the same `code` semantics as REST and include `requestId`.
Rate limits are token + tool bucket scoped.
