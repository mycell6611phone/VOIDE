**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /core/src/build — Flow Build Pipeline
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


Implements the canonical graph compiler that turns authored flows into runtime
artifacts.

**Files**
- `validate.ts` — Zod-based validation.
- `compiler.ts` — Translates FlowGraph JSON into a deterministic CompiledFlow artifact.

Ensure compiler output stays deterministic. Update CLI commands (`voide
validate`, `voide pack`) when altering behavior.

## Canonical artifacts

- **FlowGraph** — Authoring schema emitted by the renderer and persisted by the
  workspace. This is authoritative editor state. Build operates directly on the
  structured JSON payload.
- **CompiledFlow** — Execution IR consumed by the runtime. Generated exclusively
  by the compiler.

## Compiler passes (Build)

1. **Normalize** — Stabilize node/port IDs, apply defaults, and enforce
   deterministic ordering.
2. **Validate** — Run schema checks, arity checks, and confirm loops are only
   present on declared loop nodes.
3. **Type-check** — Infer and unify port types, inserting compiler-approved
   adapters where necessary.
4. **Expand blueprints** — Replace macros (e.g., Debate) with their canonical
   subgraphs.
5. **Resolve handlers** — Map each `node.type` to a runtime operator via the
   handler registry.
6. **Plan** — Produce topological layers, loop boundaries, concurrency groups,
   and resource hints.
7. **Emit IR** — Assemble the final `CompiledFlow` with operators, channels,
   schedule, constants, and telemetry hooks.

Pressing **Build** in the UI or running `voide pack` re-runs the full pass
pipeline, guaranteeing that downstream runs operate on fresh compiled output.

## Backend Transition Notes

- Track compiler pass changes (new steps, reordered passes) here so frontend/CLI teams know when cached compiled flows must be invalidated.
- When adding new IR fields, describe the expected producer (which pass sets it) and consumer (orchestrator module) to keep coordination tight.
