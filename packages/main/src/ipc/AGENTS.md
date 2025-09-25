# /packages/main/src/ipc — IPC Handlers
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Implements channel handlers for the main process. Validate payloads with
`@voide/ipc` before executing logic. Keep telemetry helpers in `telemetry.ts`
focused on in-memory lights events (no disk logging).
