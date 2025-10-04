# /packages/preload — Typed Preload Bridge
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


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
