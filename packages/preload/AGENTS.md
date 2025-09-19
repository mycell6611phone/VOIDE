# /packages/preload — Typed Preload Bridge

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
