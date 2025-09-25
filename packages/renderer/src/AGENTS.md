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
