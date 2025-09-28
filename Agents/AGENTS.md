# /Agents — Strategy Docs
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Holds meta instructions for agents (`Agent_instructions.md`). Read before making
architectural decisions; it outlines staged development chunks.

## Immutable Product Snapshot

- The VOIDE canvas enables users to drag modules onto the workspace, wire them together to compose complex data flows, and observe live activation lights to debug stalled modules or stuck loops.
