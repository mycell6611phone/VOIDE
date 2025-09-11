# PR: Step 03 — Implement IPC & Process Boundaries

## Prompt for Codex
Add typed IPC channels between renderer and main. Expose a safe preload API. Enforce validation on both sides.

### Channels
- `flow:validate` → validate a flow and return diagnostics.
- `flow:run` → start a run, return runId.
- `model:ensure` → ensure model availability, return status.
- `telemetry:event` → subscribe to event stream.
- `app:get-version` → string.

### Required Changes
1. **Types**
   - `packages/ipc/src/channels.ts` with string literals and request/response TS types.
   - Use Zod schemas for runtime validation of payloads.

2. **Main Handlers**
   - `packages/main/src/ipc/handlers.ts`: register handlers with validation + error mapping.
   - Ensure all handlers are side‑effect free and cancellable when applicable.

3. **Preload**
   - `packages/preload/src/index.ts`: `contextBridge.exposeInMainWorld('voide', { ...typed proxies... })`.

4. **Renderer Client**
   - `packages/renderer/src/lib/ipcClient.ts`: thin client wrapping `window.voide`.

### Acceptance Criteria
- Type‑safe IPC end‑to‑end. Invalid payloads rejected with structured errors.
- Preload surface contains only the documented API.
- `pnpm -w test` contains unit tests for each channel schema.

