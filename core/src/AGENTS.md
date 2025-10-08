**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

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
