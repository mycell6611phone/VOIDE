# /packages/cli/src — CLI Source
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


`index.ts` implements workspace CLI commands. Keep commands composable and
prefer dependency injection so they can be tested without side effects.
