# /core/src/runtime — Runtime Types & Helpers
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Currently houses core runtime type definitions. Keep types in sync with schema
and execution engine expectations. Expand here when adding reusable runtime
helpers.
- Define TypeScript mirrors for `CompiledFlow` structures here so that
  orchestrator/scheduler code and Electron workers share the same IR contract.
