# /packages/renderer/src/components — Renderer Components

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
