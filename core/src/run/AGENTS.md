# /core/src/run — CLI-Oriented Runner
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Entry points for executing flows from the CLI.

**Files**
- `index.ts` — Public API for running flows.
- `orchestrator.ts` — Runtime orchestrator wiring.
- `scheduler.ts` — Lightweight scheduler used by CLI execution.

Keep behavior aligned with `packages/main` orchestrator. When adding new runtime
features, ensure both codepaths evolve together.

## Runtime contract

- Accepts only `CompiledFlow` protobufs produced by the Build pipeline. Never
  read renderer state directly at run-time.
- Workers instantiate operators declared in `CompiledFlow.operators` and wire
  them through the described channels.
- The scheduler executes steps exactly as listed in `CompiledFlow.schedule`,
  handling concurrency groups, loop ticks, retries, and backpressure.
- Telemetry events stream back over the runtime bus and surface to the renderer
  for activation lights and run inspection.
