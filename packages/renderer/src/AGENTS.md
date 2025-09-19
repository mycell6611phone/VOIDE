# /packages/renderer/src — Renderer Source Map

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
