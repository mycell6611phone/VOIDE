# /core/src/modules — Runtime Modules
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


This folder contains the runtime contracts and executors for built-in modules.
Each file exports strongly-typed port definitions that must mirror the UI
modules under `src/modules` and renderer expectations.

**Files**
- `index.ts` — Registry/loader helpers.
- `llm.ts`, `prompt.ts`, `memory.ts`, `toolcall.ts` — Module-specific logic.

**Guidelines**
- Input/output schemas must stay compatible with `packages/schemas` and the
  protobuf definitions under `core/src/proto`.
- Implement modules in a way that respects offline mode — no network fetches.
- Add/update targeted tests in `core/test` whenever behavior changes.
- The compiler resolves nodes through the handler registry exposed here. Each
  module registers a `type_id → OperatorFactory` that declares port types,
  capabilities, and allowed adapters so Build can materialize `CompiledFlow`.
  Keep these contracts deterministic; runtime workers instantiate operators
  directly from the compiled registry entries.

## Backend Transition Notes

- Capture adapter compatibility rules (e.g., which module supports which adapter) here so Build-stage validation stays consistent.
- When adding module parameters that influence runtime behavior, document the corresponding IR fields and expected defaults.
