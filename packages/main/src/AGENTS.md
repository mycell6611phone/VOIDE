# /packages/main/src — Main Process Source

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
