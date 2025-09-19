# /core/src/modules — Runtime Modules

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
