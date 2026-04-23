# Domain Model

Canonical schema remains `pipes_schema_v1`.

## AI model layer (ephemeral)
- AI draft structures are typed and validated in `src/lib/ai`.
- Drafts remain ephemeral until explicit commit.
- AI edit suggestions are normalized into discrete change objects with IDs, action type, affected entity, rationale, and warnings.
- Selective apply accepts an explicit change-id set; rejected changes never mutate persisted state.
- Every AI apply path creates a pre-apply version checkpoint before mutations.

## Templates
- Templates are starter blueprints with metadata: title, description, category, use case, complexity, nodes, and pipes.
- Templates instantiate into regular systems and become fully editable.

## Import/export model
- Import accepts canonical schema JSON and validates before apply.
- Existing-system import now supports merge planning (additions/updates/conflicts summary) before apply.
- Merge apply is explicit (`safe_upsert` default, optional conflict replacement), with pre-merge version checkpoint.
- Export returns canonical JSON and deterministic markdown summary from persisted system state.
