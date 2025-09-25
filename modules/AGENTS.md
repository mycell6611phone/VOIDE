# /modules — Design Blueprints
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Contains high-level design briefs for canvas modules. `Agent.md` lists module
specifications and line references.

Use these docs to understand UX/behavior expectations before touching runtime or
UI code (`src/modules`, `core/src/modules`, renderer packages).
