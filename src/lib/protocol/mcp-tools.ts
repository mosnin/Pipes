// Canonical list of MCP tool names exposed by /api/protocol/mcp.
// Keep in sync with the if-chain in route.ts.
export const MCP_TOOLS = [
  "describe_tools",
  "list_systems",
  "get_system",
  "export_system_schema",
  "list_templates",
  "instantiate_template",
  "create_system_from_schema",
  "create_version",
  "apply_graph_actions",
  "get_validation_report",
  "add_comment",
  "list_blueprints",
  "export_subsystem_blueprint",
  "instantiate_blueprint",
  "list_patterns",
  "learn_patterns",
  "propose_loop_edit",
] as const;

export const MCP_TOOL_COUNT = MCP_TOOLS.length;
