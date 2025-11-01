**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /packages/renderer/src/components — Renderer Components
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


React components composing the Electron renderer UI.

**Key items**
- `GraphCanvas.tsx` — ReactFlow canvas integration.
- `Inspector.tsx` — Module configuration panel.
- `Palette.tsx` — Module palette.
- `PropertiesPanel.tsx` — Node/property sidebar.
- `RunControls.tsx` — Build/run controls.
- `nodes/` — Node-specific renderers.

**Guidelines**
- Use Zustand stores from `../state` for data flow.
- Prefer composition over prop drilling; break complex pieces into subcomponents.
- Keep styling aligned with Tailwind tokens defined in `/ui` to reduce drift.

## Contextual Module Menus

- `ContextWindow.tsx` renders the floating, resizable menu used for module-specific options.
  - Always clamp geometry updates via `onUpdate`; the component expects callers to persist the returned `WindowGeometry`.
  - Use `CanvasBoundaryProvider` from `GraphCanvas` to ensure the window stays within canvas bounds.
- `ModuleOptionsContent.tsx` centralizes the option layouts for Prompt, Debate, Log, Cache, Divider, and Interface modules.
  - Pass a `ParamsUpdater` that merges the existing `NodeDef.params` object; never mutate params in-place.
  - Add new module option groups here so the context menu remains the single integration surface for module settings.
  - When wiring new modules that need contextual menus, set `params.moduleKey` (palette nodes already do this) so `BasicNode` can detect the module category.
  - **LLM node windows** must fall back to overlapping the node when there isn't enough lateral canvas space. Keep the initial geometry aligned with the module before relying on `constrainRectToBounds` so the menu never spawns off-screen.

## Canvas Edit Menus

- `EditMenu.tsx` renders the shared **Cut / Copy / Paste / Delete** popover.
  - It exports `EDIT_MENU_ITEMS`, `EDIT_MENU_WIDTH/HEIGHT`, and `EDIT_MENU_DATA_ATTRIBUTE` so every caller keeps geometry + selectors consistent.
  - Buttons rely on inline hover styling; if you add menu options, keep them in this component so the visual treatment stays uniform.
- `GraphCanvas.tsx` owns edge-level menus. It clamps the popover within the canvas and delegates to the flow store helpers (`copyEdge`, `cutEdge`, `deleteEdge`, `pasteClipboard("edge")`).
- Node components (e.g., `LLMNode.tsx`) consume the same menu. They call the node helpers (`copyNode`, `cutNode`, `deleteNode`, `pasteClipboard("node")`) from the flow store.
- The flow store clipboard keeps the last copied entity and its baseline position. Repeated pastes offset by `+48,+48` from that snapshot.
- Use the exported `EDIT_MENU_DATA_ATTRIBUTE` for outside-click detection; both nodes and edges listen for `[data-voide-edit-menu]` before dismissing the menu.
  - The LLM node variant mirrors this behavior; if there is no clean space to the left or right, position the menu so it overlaps the node instead of snapping to a distant edge.

## Backend Transition Notes

- Expose backend status (Build progress, Run telemetry) through lightweight components in this folder so UI wiring stays close to canvas interactions.
- When adding controls that mutate backend state (e.g., Cancel Run), note the required IPC method and optimistic UI plan here before implementation.
