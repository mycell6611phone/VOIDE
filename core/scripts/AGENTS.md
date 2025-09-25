# /core/scripts — Core Build Helpers
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Utility scripts run during core development (e.g., protobuf generation). Execute
with Node 20+ using ESM loader (`ts-node/esm`). Update docs if adding new entry
points.
