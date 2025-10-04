# /packages/ipc/src — IPC Source
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


- `channels.ts` — Channel enum + helper utilities.
- `index.ts` — Public exports (schemas, validators).

Update tests if channel contracts change. Ensure new schemas are fully validated
and exported through `index.ts`.

## Backend Transition Notes

- Keep request/response Zod schemas colocated with helpers that coerce protobuf payloads to runtime-friendly shapes.
- Expose type-safe helpers for compiled flow handles so main-process orchestration code can avoid ad-hoc casting during Build → Run.
