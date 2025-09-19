# /core/src — Runtime Source Map

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
