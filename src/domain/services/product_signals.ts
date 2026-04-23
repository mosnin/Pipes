export const PRODUCT_SIGNAL_EVENTS = [
  "onboarding_started",
  "onboarding_completed",
  "first_system_created",
  "activation_achieved",
  "first_template_instantiated",
  "first_ai_generated_system_committed",
  "dashboard_search_used",
  "search_no_results",
  "system_reopened_from_recents",
  "favorite_added",
  "archive_used",
  "editor_opened",
  "editor_crash_boundary_triggered",
  "autosave_failure",
  "ai_edits_suggested",
  "ai_edit_partially_applied",
  "import_merge_attempted",
  "import_merge_conflict_encountered",
  "import_merged",
  "token_created",
  "token_authenticated_protocol_write",
  "invite_accepted"
] as const;

export type ProductSignalEvent = (typeof PRODUCT_SIGNAL_EVENTS)[number];

export function isProductSignalEvent(value: string): value is ProductSignalEvent {
  return (PRODUCT_SIGNAL_EVENTS as readonly string[]).includes(value);
}

export const productSignalCatalog: Record<ProductSignalEvent, { purpose: string }> = {
  onboarding_started: { purpose: "Tracks onboarding funnel entry." },
  onboarding_completed: { purpose: "Tracks onboarding funnel completion." },
  first_system_created: { purpose: "Tracks first system creation milestone." },
  activation_achieved: { purpose: "Tracks first meaningful value moment." },
  first_template_instantiated: { purpose: "Tracks first template-based creation path." },
  first_ai_generated_system_committed: { purpose: "Tracks first AI draft to committed system path." },
  dashboard_search_used: { purpose: "Tracks dashboard library search usage." },
  search_no_results: { purpose: "Tracks search queries returning no rows." },
  system_reopened_from_recents: { purpose: "Tracks recents behavior tied to retention." },
  favorite_added: { purpose: "Tracks favorite usage for ongoing organization habits." },
  archive_used: { purpose: "Tracks archive usage for lifecycle management behavior." },
  editor_opened: { purpose: "Tracks editor session starts." },
  editor_crash_boundary_triggered: { purpose: "Tracks editor crash boundary recoveries." },
  autosave_failure: { purpose: "Tracks autosave reliability failures." },
  ai_edits_suggested: { purpose: "Tracks AI edit suggestion generation volume." },
  ai_edit_partially_applied: { purpose: "Tracks partial AI edit apply outcomes." },
  import_merge_attempted: { purpose: "Tracks import merge attempts." },
  import_merge_conflict_encountered: { purpose: "Tracks import merge conflict occurrences." },
  import_merged: { purpose: "Tracks successful merge application outcomes." },
  token_created: { purpose: "Tracks protocol token creation behavior." },
  token_authenticated_protocol_write: { purpose: "Tracks agent-token authenticated write operations." },
  invite_accepted: { purpose: "Tracks collaboration invite conversion." }
};
