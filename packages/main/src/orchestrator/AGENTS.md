# /packages/main/src/orchestrator — Flow Execution Core
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Scheduling and execution logic for flows.

**Files**
- `engine.ts` — Core execution engine.
- `scheduler.ts` & `1scheduler.ts` — Scheduling helpers (alternate strategies).

**Guidelines**
- Maintain deterministic ordering for telemetry consistency.
- Keep resource usage bounded; use worker pool for heavy work.
- Document any new scheduler behavior in `RoadMap.md` if it changes UX.
