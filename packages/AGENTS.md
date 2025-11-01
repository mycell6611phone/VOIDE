**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /packages — Electron Workspace Monorepo
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


This folder contains all workspace packages consumed by the Electron app.
Everything uses pnpm workspaces with TypeScript + ESM.

**Sub-packages (see individual `AGENTS.md` inside each)**
- `main/` — Electron main process.
- `preload/` — Preload bridge that exposes the typed renderer API.
- `renderer/` — Electron renderer bundle (React + ReactFlow).
- `ipc/` — Shared IPC channel contracts + validation.
- `shared/` — Cross-process utilities/types.
- `adapters/` — Local LLM/tool adapters (stay offline-safe).
- `schemas/` — Zod schemas shared across packages.
- `workers/` — Piscina/worker thread entry points.
- `cli/` — Workspace-local CLI helpers (non-published).
- `models/` — Model manager utilities.

**Workflow**
- Build everything: `pnpm -r --filter ./packages/... build`
- Target a package: `pnpm --filter @voide/<name> <script>`

**General rules**
- Stick to ESM, Node ≥20.11.
- Keep IPC types in sync between `ipc`, `main`, `preload`, and renderer.
- Follow root offline guardrails—no network calls in adapters or renderer.

## Backend Transition Notes

- Focus Build-stage work on `@voide/main`, `@voide/ipc`, `@voide/preload`, `@voide/core`, and `@voide/adapters`. Coordinate cross-package changes in a single PR to avoid skew.
- Use `pnpm -r exec pnpm test` scoped to backend packages after large compiler/orchestrator updates to ensure contracts still align.
- Document new IPC channels or payload changes here before wiring them into the renderer to keep the workspace aligned on backend expectations.
