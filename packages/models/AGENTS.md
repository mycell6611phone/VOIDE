# /packages/models — Local Model Manager

**Contents**
- `src/modelManager.ts` — Utilities for discovering/installing offline models.
  Coordinate changes with `models/models.json` manifest.

**Guidelines**
- Stay offline: only interact with local filesystem paths.
- Validate licenses using the allowlist defined in root guardrails.
- Keep exported APIs stable; renderer/main rely on them for status reporting.
