**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

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

## Backend Transition Notes

- Persist compiled-flow metadata (hashes, timestamps, originating flow IDs) so subsequent Run requests can reuse or invalidate cached artifacts deterministically.
- When expanding worker orchestration, document thread pool sizing and backpressure strategy here before implementation.
- Wire new backend services (model manager, cache) through `services/` and reference their contracts in this file to keep the integration surface discoverable.
