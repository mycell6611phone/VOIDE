# /packages/cli — Workspace CLI Helpers
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Purpose**
Private workspace-only CLI utilities that support tooling (e.g., invoked from
root scripts). Not published.

**Structure**
- `src/` — CLI source (TypeScript).
- `dist/` — Build output (read-only).

**Guidelines**
- Keep dependencies minimal; this package mainly provides helper commands.
- Build with `pnpm --filter @voide/cli build` when scripts rely on new code.
- Follow the same offline constraints as the rest of the project.

## Backend Transition Notes

- Mirror Build/Run features exposed in the Electron app so backend flows can be tested via CLI before wiring UI affordances.
- Add smoke commands (e.g., `voide build <flow>` or `voide run <compiled>`) that exercise the same compiler/orchestrator surfaces as the main process.
