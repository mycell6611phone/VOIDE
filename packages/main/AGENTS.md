# /packages/main — Electron Main Process
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Role**
Bootstraps the Electron app, manages windows, handles IPC, and launches worker
threads. Written in TypeScript, compiled to `dist/main.js`.

**Important paths**
- `src/` — Source (entry `src/main.ts`, IPC handlers under `src/ipc/`).
- `test/` — Node `node:test` suites (`npm test` alias in package.json).
- `tsconfig.json` — Targets Node 20 ESM.

**Commands**
- Build once: `pnpm --filter @voide/main build`
- Watch (dev): `pnpm --filter @voide/main dev`
- Tests: `pnpm --filter @voide/main test`

**Guidelines**
- Keep IPC schemas aligned with `packages/ipc`.
- Use `@voide/shared` helpers instead of duplicating utilities.
- Respect offline guardrails: disable auto-updaters, avoid network calls.
- Treat Build/Run as separate steps: on `flow:build` consume the renderer's
  `FlowGraph`, invoke the core compiler, cache the resulting `CompiledFlow`, and
  on `flow:run` dispatch only that compiled artifact to workers. Never hydrate a
  run directly from renderer state.
- Main launches worker threads that instantiate operators defined in
  `CompiledFlow.operators` and streams telemetry back to the renderer for the
  lights UI.
