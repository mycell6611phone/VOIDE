# /core/src/sdk — External SDK Surface
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Exposes helpers intended for external consumers embedding VOIDE flows (`node.ts`).
Maintain semantic versioning; document breaking changes in `RoadMap.md`.

## Backend Transition Notes

- Surface Build/Run APIs that match the Electron IPC surface so integrators can reuse the same flows.
- Note any experimental SDK features here and gate them behind explicit flags before publishing wider documentation.
