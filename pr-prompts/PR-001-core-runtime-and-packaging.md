# PR: Step 01 — Establish Core Runtime & Packaging

## Prompt for Codex
You are implementing the VOIDE desktop runtime. Work in this repo. Maintain the existing monorepo layout with `pnpm` and `turbo`. Do not introduce non‑permissive licenses.

### Goals
- Electron app with Node 20+ and a unified TypeScript stack across main, preload, renderer, and optional worker processes.
- Package for Linux first (Pop!_OS), plus `.deb`, `.AppImage`, `.exe`, `.dmg` via `electron-builder`.
- CUDA/CPU flexibility for optional GPU backends. Keep CPU-only default. No hard GPU requirement.
- Enforce permissive-only licenses (MIT, BSD, Apache-2.0, ISC).

### Required Changes
1. **Node/TS Baseline**
   - Enforce Node `>=20.11` via `package.json` `engines.node` and `.nvmrc`.
   - Enable `"type": "module"` everywhere.
   - TS strict on: update `tsconfig.base.json` to `"strict": true, "verbatimModuleSyntax": true`.

2. **Electron Wiring**
   - Create `packages/main` (Electron main), `packages/preload`, `packages/renderer` if missing. Use TypeScript in all.
   - Main: create BrowserWindow with `contextIsolation: true`, `sandbox: true`. Load `renderer` with Vite dev server in dev, file URL in prod.
   - Preload: export a minimal `contextBridge` API namespace `voide` (no Node leakage).
   - Renderer: minimal React app boot with a blank canvas and a status bar.

3. **Build/Pack**
   - Add `electron-builder.yml` (reuse if present) to output `.deb`, `.AppImage`, `.exe`, `.dmg`.
   - Wire `turbo.json` pipelines: `build` compiles all packages, `pack` runs `electron-builder`.
   - Add `scripts/build-linux.sh` and `scripts/dev.sh` if missing.

4. **CUDA/CPU Flex**
   - Implement runtime detection for CUDA via environment flags: `VOIDE_ENABLE_CUDA=1`.
   - Ensure app runs fully without CUDA. GPU backends are optional adapters only.

5. **License Gate**
   - Add a `tools/license-allowlist.json` with allowed SPDX IDs: `["MIT","BSD-2-Clause","BSD-3-Clause","Apache-2.0","ISC"]`.
   - Add `scripts/license-scan.mjs` using `license-checker-rseidelsohn` to fail CI if any package violates the allowlist.
   - Add `pnpm -w run license:check` to CI and prepack.

### Acceptance Criteria
- `pnpm -w lint && pnpm -w build && pnpm -w test` pass.
- `pnpm -w run dev` launches Electron with renderer UI.
- `pnpm -w run pack:linux` produces `.deb` and `.AppImage`.
- App runs with and without `VOIDE_ENABLE_CUDA=1`.
- `pnpm -w run license:check` passes and fails on a synthetic non‑permissive dep.

### Constraints
- No CommonJS. No experimental Node flags. Keep preload surface minimal.
- Do not bundle GPU libraries by default.

### Commands
```bash
pnpm -w install
pnpm -w lint && pnpm -w build && pnpm -w test
pnpm -w run dev
pnpm -w run pack:linux
pnpm -w run license:check

