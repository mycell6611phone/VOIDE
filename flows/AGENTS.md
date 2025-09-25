# /flows — Sample Flows & Schema
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Contents**
- `sample-basic.flow.json`, `sample-self-debate.flow.json` — Reference graphs used
  by docs/tests.
- `schema/` — JSON Schema describing flow format (`flow.schema.json`).

**Usage**
- Validate a flow: `pnpm voide validate <path>` (runs via `@voide/core`).
- Pack to protobuf: `pnpm voide pack <path> --out <file>`.

**Guidelines**
- Keep samples minimal but representative; they drive acceptance testing.
- Update schemas + runtime together to avoid compatibility issues.
- Preserve formatting (2-space JSON) to keep diffs readable.
- JSON files here mirror the `FlowGraph` protobuf for human inspection, but the
  protobuf emitted by `voide pack` is the source of truth for Build/Run.
