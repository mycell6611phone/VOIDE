# /packages/models — Local Model Manager
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Contents**
- `src/modelManager.ts` — Utilities for discovering/installing offline models.
  Coordinate changes with `models/models.json` manifest.

**Guidelines**
- Stay offline: only interact with local filesystem paths.
- Validate licenses using the allowlist defined in root guardrails.
- Keep exported APIs stable; renderer/main rely on them for status reporting.
