# /flows/schema — JSON Schema Definitions

Contains machine-readable JSON Schema files for VOIDE flows.

**Files**
- `flow.schema.json` — Primary schema for flow documents.
- `schema.json` — Supporting definitions (bundled reference).

When editing schemas, sync updates with `core` Zod definitions and rerun `pnpm voide validate` on sample flows.
