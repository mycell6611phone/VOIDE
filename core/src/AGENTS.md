# /core/src — Runtime Source Map
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Layout**
- `build/` — Compilation helpers that transform canvas JSON into runtime plans.
- `flow/` — Canonical Zod schemas for authoring/validating flows.
- `modules/` — Runtime implementations & contracts for Prompt/LLM/etc.
- `nodes/` — Built-in node catalog surfaced to the renderer and CLI.
- `proto/` — TypeScript facades around protobuf messages.
- `run/` & `runtime/` — Orchestrator, scheduler, and execution engine glue.
- `sdk/` — Lightweight helper APIs intended for downstream consumers.
- `cli.ts` — Entry point consumed by `voide` binary (keeps wiring minimal).

**Working style**
- Prefer pure functions + explicit dependency injection for offline determinism.
- Align schemas with `packages/schemas` and UI expectations before shipping.
- Keep execution side effects (SQLite, filesystem) behind adapters in `runtime/`.

**When editing**
- Update/extend Vitest suites under `core/test`.
- Re-run `pnpm --filter @voide/core test` before committing.
- If changing protobuf shapes, regenerate bindings (`proto:gen`) and sync UI.

## Backend Transition Notes

- Track IR version numbers and pass ordering here so orchestrator implementations in `packages/main` remain compatible.
- When introducing new compiler diagnostics, describe the expected error codes/messages in this file before exposing them to IPC/CLI surfaces.
