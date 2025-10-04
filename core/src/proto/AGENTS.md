# /core/src/proto — Generated Proto Facades
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


TypeScript helpers around generated protobuf classes. Sync with `core/protos`.
Do not commit manual edits to generated files; extend via wrapper utilities here.

## Backend Transition Notes

- Note any helper utilities that translate between protobuf classes and plain objects so orchestrator code can use the documented path.
- When removing legacy messages, record the deprecation timeline here to coordinate cleanup in IPC/renderer layers.
