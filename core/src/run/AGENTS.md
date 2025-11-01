**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /core/src/run — CLI-Oriented Runner
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


Entry points for executing flows from the CLI.

**Files**
- `index.ts` — Public API for running flows.
- `orchestrator.ts` — Runtime orchestrator wiring.
- `scheduler.ts` — Lightweight scheduler used by CLI execution.

Keep behavior aligned with `packages/main` orchestrator. When adding new runtime
features, ensure both codepaths evolve together.

## Runtime contract

- Accepts only `CompiledFlow` artifacts produced by the Build pipeline. Never
  read renderer state directly at run-time.
- Workers instantiate operators declared in `CompiledFlow.operators` and wire
  them through the described channels.
- The scheduler executes steps exactly as listed in `CompiledFlow.schedule`,
  handling concurrency groups, loop ticks, retries, and backpressure.
- Telemetry events stream back over the runtime bus and surface to the renderer
  for activation lights and run inspection.

## Backend Transition Notes

- Keep CLI orchestrator features in sync with `packages/main/src/orchestrator`—document any intentional divergences here.
- When adding Run-stage options (e.g., tracing, breakpoints), describe the expected config shape in this file before exposing it to IPC.
