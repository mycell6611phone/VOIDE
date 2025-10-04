# /core/scripts — Core Build Helpers
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Utility scripts run during core development (e.g., protobuf generation). Execute
with Node 20+ using ESM loader (`ts-node/esm`). Update docs if adding new entry
points.

## Backend Transition Notes

- Document any new automation (e.g., IR diffing, schedule visualization) here so backend devs can reuse them during Build-stage work.
- Scripts that mutate protobufs or compiled artifacts should print the target IR version and hash to help diagnose cache drift.
