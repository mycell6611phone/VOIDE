**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /packages/ipc — Typed IPC Contracts
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


**Purpose**
Defines channel names, request/response schemas, and validation helpers shared
between main, preload, renderer, and workers.

**Structure**
- `src/` — TypeScript source with Zod schemas.
- `dist/` — Compiled output used at runtime.
- `package.json` exposes `build` + `test` (Vitest) scripts.

**Workflow**
- Update schemas: edit `src`, run `pnpm --filter @voide/ipc build`.
- Run tests: `pnpm --filter @voide/ipc test`.

**Guidelines**
- Keep channel enums stable; coordinate changes across `main` and `preload`.
- Validation errors should return structured results (no thrown strings).
- Remain offline—do not embed URLs or remote fetchers here.
- Distinguish between Build and Run contracts: `flow:build` accepts a
  `FlowGraph` payload and returns a `CompiledFlow` reference/bytes, while
  `flow:run` should consume only compiled artifacts plus run options.

## Backend Transition Notes

- Add new backend capabilities by introducing explicit channels (e.g., `flow:listCompiled`, `flow:cancelRun`) and document them here before implementation.
- Mirror `@voide/core` type exports so the compiler IR shape used in IPC stays synchronized with runtime expectations.
- After editing channel schemas, run `pnpm --filter @voide/ipc test` and `pnpm --filter @voide/main test` to verify both ends compile.
