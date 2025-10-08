# Repository Audit – 2025-02-13

## Architecture Snapshot
- Monorepo managed with PNPM workspaces plus Turbo, combining Electron (`packages/main`, `packages/preload`, `packages/renderer`), shared TypeScript runtime (`core`), IPC channel definitions (`packages/ipc`), and supporting services (workers, adapters, models, telemetry).
- Flow definitions, schemas, and sample canvases live under `flows/` and `packages/schemas`; the orchestrator in `packages/main/src/orchestrator` executes `FlowDef` graphs with built-in nodes (LLM, Prompt, Cache, Debate, Tool Call, etc.).
- Renderer state (`packages/renderer/src/state/flowStore.ts`) expects a typed preload bridge (`window.voide`) to provide validation, persistence, node catalog, run control, telemetry, and chat wiring, but currently falls back to in-memory mocks when APIs are missing.

## Actionable Task Plan

### P0 — Restore the Build → Run Feedback Loop
1. **Expose real flow/catalog IPC to the renderer.**
   - Add typed channels in `packages/ipc/src/channels.ts` for `flow:open`, `flow:save`, `flow:last-run-payloads`, `flow:stop`, `catalog:list`, etc., mirroring the existing `voide:*` handlers in `packages/main/src/ipc.ts`.
   - Update `packages/preload/src/preload.ts` to bridge the new channels and return unsubscribe functions for telemetry listeners.
   - Replace the mock merging logic in `packages/renderer/src/voide.ts` with the existing typed client (`packages/renderer/src/lib/ipcClient.ts`) so the UI always hits Electron IPC when available.

2. **Persist Build artifacts and hydrate the UI from storage.**
   - Reuse the SQLite-backed persistence in `packages/main/src/services/db.ts` by wiring `saveFlow` / `openFlow` IPC handlers to the renderer’s Save/Open buttons (`packages/renderer/src/components/PropertiesPanel.tsx`).
   - On app launch, load the last-opened flow from persistence and inject it into `useFlowStore` instead of the static mock layout.

3. **Return Run outputs and telemetry back to chats.**
   - Ensure `runFlow` resolves only after payloads are stored, then stream `getLastRunPayloads` results through IPC so `flowStore.runBuiltFlow` can append chat summaries.
   - Emit node/edge telemetry via `packages/main/src/ipc/telemetry.ts` and surface it in the renderer’s activity stores (`packages/renderer/src/state/edgeActivityStore.ts`, `portActivityStore.ts`).

### P1 — Reliability & Shutdown Hygiene
4. **Implement orchestrator shutdown & cancellation.**
   - Fill in `shutdownOrchestrator` in `packages/main/src/orchestrator/engine.ts` to stop active loops, flush telemetry, close Piscina pools, and resolve outstanding promises.
   - Ensure `stopFlow` interrupts worker jobs (LLM, tools) and transitions runs to a terminal state for UI feedback.

5. **Validate flow schemas before execution.**
   - Share the Ajv validation from `packages/main/src/services/validate.ts` with the renderer build step so invalid graphs are caught before Run.
   - Extend `core`/`packages/main` tests to cover invalid wiring, duplicate IDs, and schema mismatches (e.g., add Vitest cases under `core/test` and Node test cases under `packages/main/test`).

### P2 — Developer Experience & Future Work
6. **Integrate `@voide/core` compiler passes.**
   - Replace ad-hoc execution graph handling in `packages/main/src/orchestrator/engine.ts` with the canonical compiler outputs from `core/src/build`, keeping IR versions documented in `core/AGENTS.md`.
   - Add a Build-stage IPC handler that caches compiled flows per hash, aligning CLI (`core/src/cli.ts`) and Electron behavior.

7. **Automate chat sidecar lifecycle.**
   - Expose chat service readiness over IPC so the renderer’s `ChatWindow` can show connection status instead of assuming port 5176 is alive (`packages/renderer/src/lib/chatApi.ts`).
   - Add watchdog tests to ensure `packages/main/src/services/chatServer.ts` accepts history/send requests and enforces basic validation.

8. **Document the end-to-end developer workflow.**
   - Update `README.md` / `docs/VOIDE_HANDOFF.md` with steps for building workers (`pnpm --filter @voide/workers build`), launching the chat server, and running `electron .` once IPC wiring is complete.
   - Capture environment variables (e.g., `VOIDE_CHAT_PORT`, `VOIDE_ENABLE_CUDA`) and persistence locations (`~/.voide/voide.db`) for onboarding.

