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
