# /packages — Electron Workspace Monorepo
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


This folder contains all workspace packages consumed by the Electron app.
Everything uses pnpm workspaces with TypeScript + ESM.

**Sub-packages (see individual `AGENTS.md` inside each)**
- `main/` — Electron main process.
- `preload/` — Preload bridge that exposes the typed renderer API.
- `renderer/` — Electron renderer bundle (React + ReactFlow).
- `ipc/` — Shared IPC channel contracts + validation.
- `shared/` — Cross-process utilities/types.
- `adapters/` — Local LLM/tool adapters (stay offline-safe).
- `schemas/` — Zod schemas shared across packages.
- `workers/` — Piscina/worker thread entry points.
- `cli/` — Workspace-local CLI helpers (non-published).
- `models/` — Model manager utilities.

**Workflow**
- Build everything: `pnpm -r --filter ./packages/... build`
- Target a package: `pnpm --filter @voide/<name> <script>`

**General rules**
- Stick to ESM, Node ≥20.11.
- Keep IPC types in sync between `ipc`, `main`, `preload`, and renderer.
- Follow root offline guardrails—no network calls in adapters or renderer.
