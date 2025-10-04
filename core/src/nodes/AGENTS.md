# /core/src/nodes — Node Catalog
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Defines built-in node metadata surfaced to the UI and compiler. Keep entries in
`builtins.ts` synchronized with renderer palettes and module manifests.

## Backend Transition Notes

- Document new node capabilities (loop support, concurrency hints) here so the compiler/orchestrator can rely on them during Build planning.
- Whenever a node requires backend-only adapters or services, note the dependency here and update `packages/main/src/services` docs accordingly.
