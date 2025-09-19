# /flows — Sample Flows & Schema

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
