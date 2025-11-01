**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /core/src/modules — Runtime Modules
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


This folder contains the runtime contracts and executors for built-in modules.
Each file exports strongly-typed port definitions that must mirror the UI
modules under `src/modules` and renderer expectations.

**Files**
- `index.ts` — Registry/loader helpers.
- `llm.ts`, `prompt.ts`, `memory.ts`, `toolcall.ts` — Module-specific logic.

**Guidelines**
- Input/output schemas must stay compatible with `packages/schemas` and the shared TypeScript types consumed by Build and Run.
- Implement modules in a way that respects offline mode — no network fetches.
- Add/update targeted tests in `core/test` whenever behavior changes.
- The compiler resolves nodes through the handler registry exposed here. Each
  module registers a `type_id → OperatorFactory` that declares port types,
  capabilities, and allowed adapters so Build can materialize `CompiledFlow`.
  Keep these contracts deterministic; runtime workers instantiate operators
  directly from the compiled registry entries.

## Backend Transition Notes

- Capture adapter compatibility rules (e.g., which module supports which adapter) here so Build-stage validation stays consistent.
- When adding module parameters that influence runtime behavior, document the corresponding IR fields and expected defaults.
