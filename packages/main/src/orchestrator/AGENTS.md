# /packages/main/src/orchestrator — Flow Execution Core

Scheduling and execution logic for flows.

**Files**
- `engine.ts` — Core execution engine.
- `scheduler.ts` & `1scheduler.ts` — Scheduling helpers (alternate strategies).

**Guidelines**
- Maintain deterministic ordering for telemetry consistency.
- Keep resource usage bounded; use worker pool for heavy work.
- Document any new scheduler behavior in `RoadMap.md` if it changes UX.
