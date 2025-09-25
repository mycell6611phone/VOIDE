# /packages/renderer/src/components — Renderer Components
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


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

## Canvas Edit Menus

- `EditMenu.tsx` renders the shared **Cut / Copy / Paste / Delete** popover.
  - It exports `EDIT_MENU_ITEMS`, `EDIT_MENU_WIDTH/HEIGHT`, and `EDIT_MENU_DATA_ATTRIBUTE` so every caller keeps geometry + selectors consistent.
  - Buttons rely on inline hover styling; if you add menu options, keep them in this component so the visual treatment stays uniform.
- `GraphCanvas.tsx` owns edge-level menus. It clamps the popover within the canvas and delegates to the flow store helpers (`copyEdge`, `cutEdge`, `deleteEdge`, `pasteClipboard("edge")`).
- Node components (e.g., `LLMNode.tsx`) consume the same menu. They call the node helpers (`copyNode`, `cutNode`, `deleteNode`, `pasteClipboard("node")`) from the flow store.
- The flow store clipboard keeps the last copied entity and its baseline position. Repeated pastes offset by `+48,+48` from that snapshot.
- Use the exported `EDIT_MENU_DATA_ATTRIBUTE` for outside-click detection; both nodes and edges listen for `[data-voide-edit-menu]` before dismissing the menu.
