# /packages/ipc — Typed IPC Contracts
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Purpose**
Defines channel names, request/response schemas, and validation helpers shared
between main, preload, renderer, and workers.

**Structure**
- `src/` — TypeScript source with Zod schemas.
- `dist/` — Compiled output used at runtime.
- `package.json` exposes `build` + `test` (Vitest) scripts.

**Workflow**
- Update schemas: edit `src`, run `pnpm --filter @voide/ipc build`.
- Run tests: `pnpm --filter @voide/ipc test`.

**Guidelines**
- Keep channel enums stable; coordinate changes across `main` and `preload`.
- Validation errors should return structured results (no thrown strings).
- Remain offline—do not embed URLs or remote fetchers here.
- Distinguish between Build and Run contracts: `flow:build` accepts a
  `FlowGraph` payload and returns a `CompiledFlow` reference/bytes, while
  `flow:run` should consume only compiled artifacts plus run options.
