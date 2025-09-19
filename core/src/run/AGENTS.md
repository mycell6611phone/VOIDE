# /core/src/run — CLI-Oriented Runner

Entry points for executing flows from the CLI.

**Files**
- `index.ts` — Public API for running flows.
- `orchestrator.ts` — Runtime orchestrator wiring.
- `scheduler.ts` — Lightweight scheduler used by CLI execution.

Keep behavior aligned with `packages/main` orchestrator. When adding new runtime
features, ensure both codepaths evolve together.
