**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /packages/preload — Typed Preload Bridge
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


**Purpose**
Defines the preload script that exposes a constrained API to the renderer via
`contextBridge`. Must remain minimal and type-safe.

**Structure**
- `src/preload.ts` (entry) exports `dist/preload.js` after build.
- Imports channel contracts from `@voide/ipc` and utilities from `@voide/shared`.

**Commands**
- Build: `pnpm --filter @voide/preload build`
- Watch: `pnpm --filter @voide/preload dev`

**Guidelines**
- Only expose the documented surface on `window.voide`.
- Keep IPC channel names/types in sync with `packages/ipc`.
- Avoid heavy dependencies; this bundle is loaded eagerly by Electron.
- Separate Build vs Run entry points: preload should proxy `flow:build` to submit
  a `FlowGraph` and hand the compiled handle back to the renderer, and `flow:run`
  should forward only the compiled token plus run options.

## Backend Transition Notes

- Surface preload typings for new backend operations (`cancelRun`, `listRuns`) before wiring renderer state so front-end devs know the available hooks.
- Ensure preload gracefully handles main-process restarts by replaying pending Build promises or rejecting them with actionable errors.
