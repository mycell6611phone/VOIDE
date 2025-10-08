**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /packages/renderer/src — Renderer Source Map
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Top-level files**
- `App.tsx`, `main.tsx` — Entry + bootstrap for the Electron renderer.

**Directories**
- `components/` — React UI pieces (canvas, inspector, etc.).
- `constants/` — Shared constant values.
- `features/` — Feature-specific slices (e.g., flows, modules).
- `lib/` — Utility helpers (formatters, adapters).
- `state/` — Zustand stores/selectors for renderer state.

**Guidelines**
- Import IPC bindings from `window.voide` (typed preload) only.
- Keep feature boundaries clear to avoid tangled imports.
- Align UX with `/ui` unless Electron-specific behavior is required.
- `state/flowStore.ts` now auto-syncs LLM node names with the selected model metadata. If you add new LLM params, expose a string label (e.g., `modelLabel`) or update the helper so the canvas name stays in sync.

## Backend Transition Notes

- Document new store actions that interact with backend Build/Run flows (e.g., `compileFlow`, `startRun`) and ensure they handle optimistic UI updates when backend requests fail.
- Keep IPC DTO shapes mirrored in local TypeScript types here so renderer compilation fails fast when backend contracts change.
