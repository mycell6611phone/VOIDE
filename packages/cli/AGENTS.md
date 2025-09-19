# /packages/cli — Workspace CLI Helpers

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
