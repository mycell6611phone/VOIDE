# /packages/main/src/ipc — IPC Handlers

Implements channel handlers for the main process. Validate payloads with
`@voide/ipc` before executing logic. Keep telemetry helpers in `telemetry.ts`
focused on in-memory lights events (no disk logging).
