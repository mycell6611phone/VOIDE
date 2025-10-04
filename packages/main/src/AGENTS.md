# /packages/main/src — Main Process Source
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Key files**
- `main.ts` — Electron app entry (window creation, lifecycle).
- `ipc/` — Handler implementations for typed channels.
- `orchestrator/` — Flow execution orchestration.
- `services/` — Shared service abstractions (DB, models, etc.).
- `workerPool.ts` — Piscina worker management.
- `envelope.ts` — Flow envelope utilities bridging schemas/runtime.

**Guidelines**
- Keep startup lean; defer heavy work until after `app.ready`.
- IPC handlers should validate inputs using `@voide/ipc` before execution.
- Respect offline guardrails (no auto updates or telemetry).

## Backend Transition Notes

- Organize Build orchestration under `ipc/flowBuild.ts` (or equivalent) and route heavy processing into `orchestrator/` or `services/` modules to keep the entrypoint slim.
- Capture a durable cache location decision (in-memory vs. on-disk) here once chosen so all backend contributors reuse the same strategy.
