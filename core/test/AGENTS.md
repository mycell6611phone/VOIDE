# /core/test — Vitest Runtime Tests
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Contains Vitest suites validating runtime behavior. Ensure new runtime features
are covered here. Run with `pnpm --filter @voide/core test`.
