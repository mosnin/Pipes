# Product Signals (Post-Launch Iteration Pass)

Pipes uses a **bounded product-signal model** stored through the existing audit boundary (`action = signal.<event>`).

## Canonical events

1. onboarding_started
2. onboarding_completed
3. first_system_created
4. activation_achieved
5. first_template_instantiated
6. first_ai_generated_system_committed
7. dashboard_search_used
8. search_no_results
9. system_reopened_from_recents
10. favorite_added
11. archive_used
12. editor_opened
13. editor_crash_boundary_triggered
14. autosave_failure
15. ai_edit_partially_applied
16. import_merge_attempted
17. import_merge_conflict_encountered
18. token_created
19. token_authenticated_protocol_write
20. invite_accepted

## Design rules

- Signals are emitted only from bounded services or thin API routes that delegate to bounded services.
- Event names are explicit and stable.
- Signals are intentionally small and operational, not a full analytics platform.
- Existing audit storage and retrieval are reused for signal aggregation.

## Current summary definitions

- **Activation funnel**: onboarding_started, onboarding_completed, first_system_created, activation_achieved.
- **Search no-result rate**: `search_no_results / dashboard_search_used` in selected window.
- **Retention indicators**: system_reopened_from_recents, favorite_added, archive_used.
- **Failure indicators**: autosave_failure, editor_crash_boundary_triggered, import_merge_conflict_encountered.

## Intentional deferrals

- No external warehouse/export pipeline yet.
- No cohort modeling beyond bounded event counts.
- No heavy derived analytics tables.
