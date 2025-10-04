# /mvp — Legacy Prototype Artifacts
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Contains early MVP experiments (e.g., `server/`). These are not part of the
current build but may offer reference code. Avoid modifying unless explicitly
reviving MVP features.

## Backend Transition Notes

- Use this directory only for historical reference; document any learnings you port into the modern backend so others know the provenance.
