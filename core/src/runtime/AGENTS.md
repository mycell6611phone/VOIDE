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

## Backend Transition Notes

- Capture any new runtime bus events or telemetry enums here before wiring them into the Electron lights UI.
- Provide typed factories for worker contexts so `packages/main` can spin up execution environments without duplicating setup logic.
