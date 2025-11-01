**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /packages/renderer — Electron Renderer Bundle
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


**Role**
The production renderer shipped inside Electron. Shares many concepts with the
standalone `/ui` package but integrates tightly with IPC and Electron APIs.

**Key pieces**
- `src/` — React app using ReactFlow for graph editing.
- `vite.config.ts` — Bundles renderer assets.
- Depends on `@voide/ipc`, `@voide/shared`, `zustand`, `reactflow`, etc.

**Commands**
- Dev: `pnpm --filter @voide/renderer dev`
- Build: `pnpm --filter @voide/renderer build`

**Guidelines**
- Any IPC usage must go through the typed preload bridge (`window.voide`).
- Keep component state minimal; heavy logic should live in shared packages.
- Mirror UI conventions defined in `/ui` to avoid divergence.
- The canvas owns mutable editor state (nodes, ports, edges). On **Build** it
  serializes to the canonical `FlowGraph` JSON payload and sends it across IPC
  for compilation. Standalone exports are for debugging only.
- Pressing **Run** must reuse the `CompiledFlow` returned by Build rather than
  re-reading renderer state, ensuring runtime parity with the CLI and main
  process.

## Backend Transition Notes

- Coordinate renderer store changes with backend contracts—document new preload methods and IPC payload expectations here before coding UI updates.
- Add developer toggles that surface compiled-flow hashes or backend errors to speed up debugging during Build-stage work.
