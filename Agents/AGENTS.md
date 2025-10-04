# /Agents — Strategy Docs
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Holds meta instructions for agents (`Agent_instructions.md`). Read before making
architectural decisions; it outlines staged development chunks.

## Immutable Product Snapshot

- The VOIDE canvas enables users to drag modules onto the workspace, wire them together to compose complex data flows, and observe live activation lights to debug stalled modules or stuck loops.

## Backend Transition Notes

- Cross-reference `Agent_instructions.md` with the updated Build-stage notes in `/Agents.md` before writing new runtime code.
- Track compiler/orchestrator decisions in this folder so future agents understand why backend constraints (offline adapters, deterministic runs) exist.
- Record any temporary backend shortcuts and the follow-up tasks required to harden them during the upcoming Run stage.
