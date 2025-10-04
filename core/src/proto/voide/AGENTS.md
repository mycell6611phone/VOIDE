# /core/src/proto/voide — Generated VOIDE Protos
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Namespace-specific protobuf facades for VOIDE schemas. Regenerated via
`pnpm --filter @voide/core proto:gen`. Avoid editing manually; add helpers in
adjacent non-generated files if needed.

## Backend Transition Notes

- When adding new VOIDE-specific messages, describe their role (Build vs. Run) here so downstream packages know how to consume them.
- Keep a changelog snippet in this file whenever message field numbers change to help track compatibility with persisted data.
