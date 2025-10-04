# /flows/schema — JSON Schema Definitions
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Contains machine-readable JSON Schema files for VOIDE flows.

**Files**
- `flow.schema.json` — Primary schema for flow documents.
- `schema.json` — Supporting definitions (bundled reference).

When editing schemas, sync updates with `core` Zod definitions and rerun `pnpm voide validate` on sample flows.

## Backend Transition Notes

- Keep schema revisions paired with updates to the compiler input types in `core/src/flow` and any IPC payloads in `packages/ipc`.
- Record schema version bumps in commit messages so backend migrations can track which CompiledFlow artifacts remain compatible.
