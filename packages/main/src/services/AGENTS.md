# /packages/main/src/services — Main Process Services
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Service abstractions for the main process (DB, models, validation, FAISS client).

**Guidelines**
- Keep DB access (`db.ts`) confined here; expose high-level APIs.
- `faissClient.ts` should gracefully handle the FAISS daemon being unavailable.
- `secrets.ts` must store data securely offline (e.g., keytar) and never sync to cloud.
- Validation helpers should reuse schemas from `@voide/schemas`/`@voide/ipc`.

## Backend Transition Notes

- Document cache/storage decisions (SQLite vs. JSON file) alongside the service that owns them so Build and Run agree on persistence.
- Provide mock implementations for services so orchestrator tests in `packages/main` and Vitest suites in `@voide/core` can run without native dependencies.
